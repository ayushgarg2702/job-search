import "server-only";
import { db } from "./db";
import { getDraft, setStatus, type Job } from "./jobs";
import { resumeHtml } from "./resume-html";
import { getProfile, getSettings } from "./store";

export type ApplySession = {
  id: number;
  job_id: number;
  status: string;
  message: string;
  screenshot: string | null;
  filled: { label: string; value: string }[];
  skipped: { label: string; reason: string }[];
  warnings: string[];
  updated_at: string;
};

export function latestSession(jobId: number): ApplySession | null {
  const row = db().prepare("SELECT * FROM apply_sessions WHERE job_id = ? ORDER BY id DESC LIMIT 1").get(jobId) as
    | (Record<string, string> & { id: number; job_id: number })
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    job_id: row.job_id,
    status: row.status,
    message: row.message,
    screenshot: row.screenshot || null,
    filled: JSON.parse(row.filled),
    skipped: JSON.parse(row.skipped),
    warnings: JSON.parse(row.warnings),
    updated_at: row.updated_at,
  };
}

export function updateSession(
  id: number,
  patch: Partial<Pick<ApplySession, "status" | "message" | "screenshot" | "filled" | "skipped" | "warnings">>,
) {
  const s = db().prepare("SELECT * FROM apply_sessions WHERE id = ?").get(id) as Record<string, string> | undefined;
  if (!s) return null;
  db()
    .prepare(
      "UPDATE apply_sessions SET status = ?, message = ?, screenshot = ?, filled = ?, skipped = ?, warnings = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .run(
      patch.status ?? s.status,
      patch.message ?? s.message,
      patch.screenshot ?? s.screenshot,
      patch.filled ? JSON.stringify(patch.filled) : s.filled,
      patch.skipped ? JSON.stringify(patch.skipped) : s.skipped,
      patch.warnings ? JSON.stringify(patch.warnings) : s.warnings,
      id,
    );
  return Number(s.job_id);
}

/** Knock-out questions an ATS uses to auto-reject. Checked before the form is touched. */
function knockoutWarnings(job: Job): string[] {
  const profile = getProfile();
  const warnings: string[] = [];
  const ev = job.evaluation;
  if (ev?.blockers.length) warnings.push(...ev.blockers);
  if (/immediate joiner|immediate joining|join immediately|notice period.{0,20}(15|0) days/i.test(job.description)) {
    if ((profile.noticePeriodDays ?? 0) > 30) {
      warnings.push(`They want someone who can join quickly. Your notice period is ${profile.noticePeriodDays} days.`);
    }
  }
  if (/work from office|5 days.{0,10}office|onsite only/i.test(job.description) && profile.preferredCities.length && !profile.preferredCities.includes(job.city)) {
    warnings.push(`Office role in ${job.city}, which is not in your preferred cities.`);
  }
  return warnings;
}

export async function startAutofill(job: Job): Promise<{ ok: true; message?: string } | { ok: false; error: string }> {
  const draft = getDraft(job.id);
  if (!draft) return { ok: false, error: "No draft for this job." };
  const settings = getSettings();
  const profile = getProfile();
  const warnings = knockoutWarnings(job);

  const session = db()
    .prepare("INSERT INTO apply_sessions (job_id, status, message, warnings) VALUES (?, 'starting', 'Opening the application…', ?)")
    .run(job.id, JSON.stringify(warnings));
  const sessionId = Number(session.lastInsertRowid);

  const appUrl = `http://127.0.0.1:${process.env.PORT ?? 43123}`;
  try {
    const res = await fetch(`${settings.browserWorkerUrl}/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        sessionId,
        jobId: job.id,
        url: job.apply_url || job.url,
        source: job.source,
        callbackUrl: `${appUrl}/api/apply/${job.id}`,
        resumeHtml: resumeHtml(draft.pack.resumeMarkdown),
        coverLetter: draft.pack.coverLetter,
        answers: draft.pack.answers,
        profile: {
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          city: profile.city,
          linkedin: profile.linkedin,
          github: profile.github,
          portfolio: profile.portfolio,
          yearsExperience: profile.yearsExperience,
          currentCtcInr: profile.currentCtcInr,
          expectedCtcInr: profile.expectedCtcInr,
          noticePeriodDays: profile.noticePeriodDays,
          currentCompany: profile.experience[0]?.company ?? "",
          currentTitle: profile.experience[0]?.title ?? "",
        },
      }),
    });
    if (!res.ok) throw new Error(`worker said ${res.status}`);
  } catch (err) {
    updateSession(sessionId, { status: "failed", message: "Browser worker is not running." });
    return {
      ok: false,
      error: `Could not reach the browser worker (${(err as Error).message}). Start it with: pnpm worker:browser`,
    };
  }
  setStatus(job.id, "autofilling", "Approved by you");
  return { ok: true, message: "Approved. A browser window is opening the application." };
}
