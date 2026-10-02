"use server";

import { DraftPackSchema, JobStatusSchema, MANUAL_STATUSES, type DraftPack } from "@career-os/shared";
import { revalidatePath } from "next/cache";
import { startAutofill } from "@/lib/apply";
import { declineJob, getDraft, getJob, setStatus, updateDraftPack } from "@/lib/jobs";
import { queueDraft } from "@/lib/pipeline";
import { hasResume } from "@/lib/store";
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
