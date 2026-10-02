"use server";

import { coachAnswer, type CoachFeedback } from "@career-os/agents";
import { QUESTION_BANK, type QuestionTrack } from "@career-os/engine";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getProfile, getSettings } from "@/lib/store";

function pick<T>(list: T[], n: number): T[] {
  return [...list].sort(() => Math.random() - 0.5).slice(0, n);
}

export async function startMock(input: { track: QuestionTrack; role: string; count: number }) {
  const count = Math.min(8, Math.max(3, Math.round(input.count)));
  const ofTrack = QUESTION_BANK.filter((q) => q.track === input.track);
  const behavioural = QUESTION_BANK.filter((q) => q.track === "behavioural");
  const hr = QUESTION_BANK.filter((q) => q.track === "hr_india");
  const chosen =
    input.track === "behavioural" || input.track === "hr_india"
      ? pick(ofTrack, count)
      : [...pick(behavioural, 1), ...pick(ofTrack, count - 2), ...pick(hr, 1)];
  const res = db()
    .prepare("INSERT INTO interview_sessions (track, role, questions) VALUES (?, ?, ?)")
    .run(input.track, input.role.trim(), JSON.stringify(chosen));
  redirect(`/interviews/${res.lastInsertRowid}`);
}

export async function submitAnswer(input: {
  sessionId: number;
  question: string;
  answer: string;
  seconds: number;
}): Promise<{ ok: true; feedback: CoachFeedback } | { ok: false; error: string }> {
  if (!input.answer.trim()) return { ok: false, error: "Type your answer first, even a rough one." };
  const session = db().prepare("SELECT role FROM interview_sessions WHERE id = ?").get(input.sessionId) as { role: string } | undefined;
  if (!session) return { ok: false, error: "Session not found." };
  const profile = getProfile();
  const feedback = await coachAnswer(input.question, input.answer, {
    role: session.role || profile.headline,
    resumeText: profile.resumeText,
    model: getSettings().cursorModel || undefined,
  });
  db()
    .prepare("INSERT INTO interview_answers (session_id, question, answer, feedback, score, seconds) VALUES (?, ?, ?, ?, ?, ?)")
    .run(input.sessionId, input.question, input.answer, JSON.stringify(feedback), feedback.score, Math.round(input.seconds));
  return { ok: true, feedback };
}

export async function finishMock(sessionId: number) {
  const avg = db().prepare("SELECT ROUND(AVG(score)) AS a FROM interview_answers WHERE session_id = ?").get(sessionId) as { a: number | null };
  db()
    .prepare("UPDATE interview_sessions SET finished_at = datetime('now'), avg_score = ? WHERE id = ? AND finished_at IS NULL")
    .run(avg.a ?? 0, sessionId);
  db().prepare("INSERT INTO practice_logs (kind, minutes, score, note) VALUES ('mock', 0, ?, 'Mock interview')").run(avg.a ?? 0);
  revalidatePath("/", "layout");
}
