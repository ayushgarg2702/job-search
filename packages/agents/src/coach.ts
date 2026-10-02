import { rubricFeedback, type AnswerFeedback } from "@career-os/engine";
import { cursorReady, extractJson, runCursor } from "./cursor";
import { VOICE_RULES } from "./voice";

export type CoachFeedback = AnswerFeedback & { better: string | null; source: "cursor" | "rubric" };

/** Feedback on one mock interview answer. */
export async function coachAnswer(
  question: string,
  answer: string,
  context: { role?: string; resumeText?: string; model?: string } = {},
): Promise<CoachFeedback> {
  const rubric = rubricFeedback(question, answer);
  const cursor = cursorReady();
  if (!cursor.installed || cursor.loggedIn === false || answer.trim().length < 10) {
    return { ...rubric, better: null, source: "rubric" };
  }

  const prompt = `You are an interviewer at an Indian tech company giving blunt, useful feedback on a practice answer. Do not use any tools. Only reply with text.

Role: ${context.role || "not given"}
Question: ${question}
Candidate answer: ${answer}

Candidate resume (for checking what they could have mentioned):
${(context.resumeText ?? "").slice(0, 4000)}

Give a score 0-100, up to 3 things that worked, up to 3 things to fix, and a tighter version of the answer that uses only facts from their answer or resume.
Voice for the tighter version:
${VOICE_RULES}

Reply with only JSON: {"score": 0, "good": ["..."], "improve": ["..."], "better": "..."}`;

  try {
    const raw = await runCursor(prompt, { model: context.model, timeoutMs: 90_000 });
    const parsed = extractJson<{ score: number; good: string[]; improve: string[]; better: string }>(raw);
    return {
      score: Math.max(0, Math.min(100, Math.round(parsed.score))),
      good: parsed.good?.slice(0, 3) ?? [],
      improve: parsed.improve?.slice(0, 3) ?? [],
      better: parsed.better ?? null,
      source: "cursor",
    };
  } catch {
    return { ...rubric, better: null, source: "rubric" };
  }
}
