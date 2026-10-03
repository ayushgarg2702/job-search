import { QUESTION_BANK, type BankQuestion, type QuestionTrack } from "@career-os/engine";
import { cursorReady, extractJson, runCursor } from "./cursor";

export type GeneratedQuestions = {
  source: "cursor" | "bank";
  questions: BankQuestion[];
};

function fallbackQuestions(track: QuestionTrack, count: number): BankQuestion[] {
  const ofTrack = QUESTION_BANK.filter((q) => q.track === track);
  const behavioural = QUESTION_BANK.filter((q) => q.track === "behavioural");
  const hr = QUESTION_BANK.filter((q) => q.track === "hr_india");
  const pick = <T>(list: T[], n: number) => [...list].sort(() => Math.random() - 0.5).slice(0, n);
  if (track === "behavioural" || track === "hr_india") return pick(ofTrack, count);
  return [...pick(behavioural, 1), ...pick(ofTrack, Math.max(1, count - 2)), ...pick(hr, 1)].slice(0, count);
}

/**
 * Generate interview questions for a target role (and optional JD).
 * Falls back to the small offline bank when Cursor is unavailable.
 */
export async function generateInterviewQuestions(input: {
  track: QuestionTrack;
  role: string;
  skills?: string[];
  jobDescription?: string;
  count?: number;
  model?: string;
}): Promise<GeneratedQuestions> {
  const count = Math.min(12, Math.max(3, Math.round(input.count ?? 6)));
  const offline: GeneratedQuestions = {
    source: "bank",
    questions: fallbackQuestions(input.track, count).map((q) => ({ ...q, track: input.track })),
  };

  const cursor = cursorReady();
  if (!cursor.installed || cursor.loggedIn === false) return offline;

  const trackHint: Record<QuestionTrack, string> = {
    behavioural: "behavioural / STAR stories",
    hr_india: "India HR round (CTC, notice, relocation, why change)",
    backend: "backend systems, APIs, databases, reliability",
    frontend: "frontend, React, performance, UX engineering",
    data: "data / ML / SQL / modelling",
    product: "product sense and metrics",
  };

  const prompt = `You write interview questions for an Indian tech company. Do not use tools. Reply with JSON only.

Round type: ${input.track} (${trackHint[input.track]})
Role practising for: ${input.role || "not specified"}
Candidate skills: ${(input.skills ?? []).slice(0, 30).join(", ") || "not listed"}
Job description excerpt (may be empty):
${(input.jobDescription ?? "").slice(0, 3500) || "(none — invent realistic questions for the role)"}

Return JSON:
{"questions":[{"question":"...","tip":"..."}]}

Rules:
- Exactly ${count} questions.
- Questions must be specific to this role / JD when provided.
- tip: one short coaching tip, practical, not fluff.
- Mix depth: some fundamentals, some senior judgment if the role is senior.
- No duplicate questions.`;

  try {
    const raw = await runCursor(prompt, { model: input.model, timeoutMs: 120_000 });
    const parsed = extractJson<{ questions?: { question: string; tip: string }[] }>(raw);
    const questions = (parsed.questions ?? [])
      .filter((q) => q.question?.trim())
      .slice(0, count)
      .map((q) => ({
        track: input.track,
        question: q.question.trim(),
        tip: (q.tip ?? "").trim() || "Answer with one concrete example and a number.",
      }));
    if (questions.length < 3) return offline;
    return { source: "cursor", questions };
  } catch {
    return offline;
  }
}
