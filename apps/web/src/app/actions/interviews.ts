"use server";

import { generateInterviewQuestions, coachAnswer, type CoachFeedback } from "@career-os/agents";
import type { QuestionTrack } from "@career-os/engine";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, setKv } from "@/lib/db";
import { interviewCacheKey, type CachedInterviewBank } from "@/lib/interview-cache";
import { getJob } from "@/lib/jobs";
import { getProfile, getSettings } from "@/lib/store";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export async function generateSampleQuestions(input: {
  track: QuestionTrack;
  role?: string;
  jobId?: number | null;
}): Promise<ActionResult> {
  const profile = getProfile();
  const role = (input.role?.trim() || profile.targetTitles[0] || profile.headline || "Software Engineer").trim();
  let jobDescription = "";
  if (input.jobId) {
    const job = getJob(input.jobId);
    if (job) jobDescription = `${job.title} at ${job.company}\n\n${job.description}`;
  }
  const generated = await generateInterviewQuestions({
    track: input.track,
    role,
    skills: profile.skills,
    jobDescription,
    count: 8,
    model: getSettings().cursorModel || undefined,
  });
  setKv(interviewCacheKey(input.track, role), {
    track: input.track,
    role,
    source: generated.source,
    questions: generated.questions,
    at: new Date().toISOString(),
  } satisfies CachedInterviewBank);
  revalidatePath("/interviews");
  return {
    ok: true,
    message:
      generated.source === "cursor"
        ? `Generated ${generated.questions.length} questions for ${role}.`
        : `Cursor offline — using fallback bank for ${role}.`,
  };
}

export async function startMock(input: {
  track: QuestionTrack;
  role: string;
  count: number;
  jobId?: number | null;
}) {
  const count = Math.min(8, Math.max(3, Math.round(input.count)));
  const profile = getProfile();
  const role = input.role.trim() || profile.targetTitles[0] || "Software Engineer";
  let jobDescription = "";
  if (input.jobId) {
    const job = getJob(input.jobId);
    if (job) jobDescription = `${job.title} at ${job.company}\n\n${job.description}`;
  }

  const generated = await generateInterviewQuestions({
    track: input.track,
    role,
    skills: profile.skills,
    jobDescription,
    count,
    model: getSettings().cursorModel || undefined,
  });

  const res = db()
    .prepare("INSERT INTO interview_sessions (track, role, questions) VALUES (?, ?, ?)")
    .run(input.track, role, JSON.stringify(generated.questions));
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
  const avg = db().prepare("SELECT ROUND(AVG(score)) AS a FROM interview_answers WHERE session_id = ?").get(sessionId) as {
    a: number | null;
  };
  db()
    .prepare("UPDATE interview_sessions SET finished_at = datetime('now'), avg_score = ? WHERE id = ? AND finished_at IS NULL")
    .run(avg.a ?? 0, sessionId);
  db().prepare("INSERT INTO practice_logs (kind, minutes, score, note) VALUES ('mock', 0, ?, 'Mock interview')").run(avg.a ?? 0);
  revalidatePath("/", "layout");
}
