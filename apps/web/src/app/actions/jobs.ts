"use server";

import { DraftPackSchema, JobStatusSchema, MANUAL_STATUSES, type DraftPack } from "@career-os/shared";
import { revalidatePath } from "next/cache";
import { answerFormQuestions } from "@career-os/agents";
import { latestSession, startAutofill } from "@/lib/apply";
import { declineJob, getDraft, getJob, setStatus, updateDraftPack } from "@/lib/jobs";
import { queueDraft } from "@/lib/pipeline";
import { getProfile, getSettings, hasResume } from "@/lib/store";
import type { ActionResult } from "./profile";

function refresh() {
  revalidatePath("/", "layout");
}

export async function writeDraft(jobId: number): Promise<ActionResult> {
  if (!hasResume()) return { ok: false, error: "Upload your resume first. Drafts are built from it." };
  if (!getJob(jobId)) return { ok: false, error: "Job not found." };
  queueDraft(jobId);
  refresh();
  return { ok: true, message: "Writing the draft. It takes a minute or two with the Cursor agent." };
}

export async function decline(jobId: number, reason = ""): Promise<ActionResult> {
  declineJob(jobId, reason.trim());
  refresh();
  return { ok: true };
}

export async function saveDraftEdits(jobId: number, pack: DraftPack): Promise<ActionResult> {
  const parsed = DraftPackSchema.safeParse(pack);
  if (!parsed.success) return { ok: false, error: "Draft is incomplete." };
  updateDraftPack(jobId, parsed.data);
  refresh();
  return { ok: true, message: "Draft saved." };
}

export async function approve(jobId: number): Promise<ActionResult> {
  const job = getJob(jobId);
  if (!job) return { ok: false, error: "Job not found." };
  if (!getDraft(jobId)) return { ok: false, error: "Write a draft before approving." };
  const res = await startAutofill(job);
  refresh();
  return res;
}

export async function answerOpenQuestions(jobId: number): Promise<ActionResult> {
  const job = getJob(jobId);
  const draft = getDraft(jobId);
  const session = latestSession(jobId);
  if (!job || !draft || !session) return { ok: false, error: "Approve the job first." };
  const known = new Set(draft.pack.answers.map((a) => a.question));
  const questions = session.skipped
    .filter((s) => /no answer/i.test(s.reason) && s.label.length > 12 && !known.has(s.label))
    .map((s) => s.label);
  if (questions.length === 0) return { ok: false, error: "No open questions left." };
  const { answers, source } = await answerFormQuestions(
    getProfile(),
    { title: job.title, company: job.company, location: job.location, description: job.description },
    questions,
    { model: getSettings().cursorModel || undefined },
  );
  if (answers.length === 0) {
    return { ok: false, error: "Your resume doesn't cover these questions. Answer them in the form yourself." };
  }
  updateDraftPack(jobId, { ...draft.pack, answers: [...draft.pack.answers, ...answers] });
  refresh();
  return {
    ok: true,
    message: `Wrote ${answers.length} answer${answers.length === 1 ? "" : "s"}${source === "resume" ? " from your resume bullets" : ""}. Press Fill again to put them in the form.`,
  };
}

export async function fillMyself(jobId: number): Promise<ActionResult> {
  setStatus(jobId, "ready_to_submit", "You chose to fill the form yourself");
  refresh();
  return { ok: true };
}

export async function markStatus(jobId: number, status: string): Promise<ActionResult> {
  const parsed = JobStatusSchema.safeParse(status);
  if (!parsed.success || !MANUAL_STATUSES.includes(parsed.data)) return { ok: false, error: "You can't set that status by hand." };
  setStatus(jobId, parsed.data, "Updated by you");
  refresh();
  return { ok: true };
}
