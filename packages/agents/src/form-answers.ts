import { extractSkills } from "@career-os/engine";
import type { Answer, Profile } from "@career-os/shared";
import { cursorReady, extractJson, runCursor } from "./cursor";
import { checkProvenance } from "./provenance";
import { lintVoice, VOICE_RULES } from "./voice";
import type { JobForDraft } from "./template";

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Picks the resume bullets closest to the question. No model, no invention. */
function fallbackAnswer(profile: Profile, question: string): string {
  const qSkills = extractSkills(question);
  const qWords = new Set(question.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const scored = profile.experience.flatMap((e) =>
    e.bullets.map((b) => {
      const skillHit = extractSkills(b).filter((s) => qSkills.includes(s)).length;
      const wordHit = b.toLowerCase().split(/\W+/).filter((w) => qWords.has(w)).length;
      return { b, company: e.company, score: skillHit * 3 + wordHit };
    }),
  );
  const best = scored.sort((a, b) => b.score - a.score).slice(0, 2).filter((x) => x.score > 0);
  if (best.length === 0) return "";
  return best.map((x) => `At ${x.company || "my current job"}, I ${lowerFirst(x.b.replace(/\.$/, ""))}.`).join(" ");
}

/** Answers for the extra questions a specific application form asks. */
export async function answerFormQuestions(
  profile: Profile,
  job: JobForDraft,
  questions: string[],
  opts: { model?: string } = {},
): Promise<{ answers: Answer[]; source: "cursor" | "resume" }> {
  const cursor = cursorReady();
  if (!cursor.installed || cursor.loggedIn === false) {
    return {
      source: "resume",
      answers: questions.map((q) => ({ question: q, answer: fallbackAnswer(profile, q) })).filter((a) => a.answer),
    };
  }

  const prompt = `Answer these questions from a job application form for the candidate. Do not use any tools. Only reply with text.

Job: ${job.title} at ${job.company} (${job.location})
${job.description.slice(0, 3000)}

Candidate facts (the only source of truth):
${JSON.stringify({ skills: profile.skills, experience: profile.experience, years: profile.yearsExperience, summary: profile.summary }, null, 2)}

Questions:
${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Rules:
- 40-120 words each, first person, specific to the facts above.
- If the facts don't cover a question, say so plainly in one sentence instead of making something up.
- Never invent numbers, employers, tools or projects.
${VOICE_RULES}

Reply with only JSON: {"answers": [{"question": "...", "answer": "..."}]}`;

  try {
    const raw = await runCursor(prompt, { model: opts.model, timeoutMs: 150_000 });
    const parsed = extractJson<{ answers: Answer[] }>(raw);
    const clean = parsed.answers.filter((a) => {
      const issues = checkProvenance(a.answer, profile, job.description);
      return a.answer && issues.length === 0 && lintVoice(a.answer).length === 0;
    });
    return { source: "cursor", answers: clean };
  } catch {
    return {
      source: "resume",
      answers: questions.map((q) => ({ question: q, answer: fallbackAnswer(profile, q) })).filter((a) => a.answer),
    };
  }
}
