import "server-only";
import type { Evaluation } from "@career-os/engine";
import type { DraftPack, JobStatus, NormalizedJob } from "@career-os/shared";
import { normalizeCity } from "@career-os/shared";
import { createHash } from "node:crypto";
import { db } from "./db";

export type JobRow = {
  id: number;
  fingerprint: string;
  source: string;
  external_id: string | null;
  title: string;
  company: string;
  location: string;
  city: string;
  url: string;
  apply_url: string | null;
  description: string;
  salary_min: number | null;
  salary_max: number | null;
  is_remote: number;
  posted_at: string | null;
  status: JobStatus;
  score: number | null;
  evaluation: string | null;
  decline_reason: string | null;
  fetched_at: string;
  updated_at: string;
};

export type Job = Omit<JobRow, "evaluation" | "is_remote"> & {
  evaluation: Evaluation | null;
  isRemote: boolean;
};

export type DraftRow = {
  job_id: number;
  pack: DraftPack;
  source: "cursor" | "template";
  steps: { name: string; ok: boolean; note: string }[];
  voice: { phrase: string }[];
  provenance: { kind: string; value: string; context: string }[];
  updated_at: string;
};

function hydrate(row: JobRow): Job {
  const { evaluation, is_remote, ...rest } = row;
  return { ...rest, isRemote: Boolean(is_remote), evaluation: evaluation ? JSON.parse(evaluation) : null };
}

/** Same role posted on two boards should land once. */
export function fingerprint(job: Pick<NormalizedJob, "title" | "company" | "location">): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const key = `${norm(job.company)}|${norm(job.title)}|${normalizeCity(job.location)}`;
  return createHash("sha1").update(key).digest("hex");
}

export function insertJobs(jobs: NormalizedJob[]): number[] {
  const insert = db().prepare(`
    INSERT OR IGNORE INTO jobs
      (fingerprint, source, external_id, title, company, location, city, url, apply_url, description,
       salary_min, salary_max, is_remote, posted_at)
    VALUES (@fingerprint, @source, @externalId, @title, @company, @location, @city, @url, @applyUrl,
       @description, @salaryMinInr, @salaryMaxInr, @isRemote, @postedAt)`);
  const event = db().prepare("INSERT INTO job_events (job_id, status, note) VALUES (?, 'discovered', ?)");
  const added: number[] = [];
  const tx = db().transaction((list: NormalizedJob[]) => {
    for (const j of list) {
      if (!j.title || !j.company || !j.url) continue;
      const res = insert.run({
        ...j,
        fingerprint: fingerprint(j),
        city: normalizeCity(j.location),
        isRemote: j.isRemote ? 1 : 0,
      });
      if (res.changes > 0) {
        const id = Number(res.lastInsertRowid);
        event.run(id, `From ${j.source}`);
        added.push(id);
      }
    }
  });
  tx(jobs);
  return added;
}

export function getJob(id: number): Job | null {
  const row = db().prepare("SELECT * FROM jobs WHERE id = ?").get(id) as JobRow | undefined;
  return row ? hydrate(row) : null;
}

export function listJobs(statuses?: JobStatus[], limit = 500): Job[] {
  if (statuses && statuses.length) {
    const marks = statuses.map(() => "?").join(",");
    return (
      db()
        .prepare(`SELECT * FROM jobs WHERE status IN (${marks}) ORDER BY COALESCE(score, -1) DESC, id DESC LIMIT ?`)
        .all(...statuses, limit) as JobRow[]
    ).map(hydrate);
  }
  return (db().prepare("SELECT * FROM jobs ORDER BY id DESC LIMIT ?").all(limit) as JobRow[]).map(hydrate);
}

export function setStatus(id: number, status: JobStatus, note?: string) {
  const current = db().prepare("SELECT status FROM jobs WHERE id = ?").get(id) as { status: string } | undefined;
  if (!current || current.status === status) return;
  db().prepare("UPDATE jobs SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  db().prepare("INSERT INTO job_events (job_id, status, note) VALUES (?, ?, ?)").run(id, status, note ?? null);
}

export function saveEvaluation(id: number, evaluation: Evaluation) {
  db()
    .prepare("UPDATE jobs SET score = ?, evaluation = ?, updated_at = datetime('now') WHERE id = ?")
    .run(evaluation.score, JSON.stringify(evaluation), id);
}

export function declineJob(id: number, reason: string) {
  db().prepare("UPDATE jobs SET decline_reason = ? WHERE id = ?").run(reason || null, id);
  setStatus(id, "declined", reason || undefined);
}

export function getDraft(jobId: number): DraftRow | null {
  const row = db().prepare("SELECT * FROM drafts WHERE job_id = ?").get(jobId) as
    | (Record<string, string> & { job_id: number })
    | undefined;
  if (!row) return null;
  return {
    job_id: row.job_id,
    pack: JSON.parse(row.pack),
    source: row.source as DraftRow["source"],
    steps: JSON.parse(row.steps),
    voice: JSON.parse(row.voice),
    provenance: JSON.parse(row.provenance),
    updated_at: row.updated_at,
  };
}

export function saveDraft(
  jobId: number,
  data: { pack: DraftPack; source: string; steps: unknown; voice: unknown; provenance: unknown },
) {
  db()
    .prepare(`
      INSERT INTO drafts (job_id, pack, source, steps, voice, provenance)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(job_id) DO UPDATE SET pack = excluded.pack, source = excluded.source, steps = excluded.steps,
        voice = excluded.voice, provenance = excluded.provenance, updated_at = datetime('now')`)
    .run(jobId, JSON.stringify(data.pack), data.source, JSON.stringify(data.steps), JSON.stringify(data.voice), JSON.stringify(data.provenance));
}

export function updateDraftPack(jobId: number, pack: DraftPack) {
  db().prepare("UPDATE drafts SET pack = ?, updated_at = datetime('now') WHERE job_id = ?").run(JSON.stringify(pack), jobId);
}

export function jobEvents(jobId: number) {
  return db()
    .prepare("SELECT status, note, at FROM job_events WHERE job_id = ? ORDER BY id ASC")
    .all(jobId) as { status: JobStatus; note: string | null; at: string }[];
}

export function statusCounts(): Record<string, number> {
  const rows = db().prepare("SELECT status, COUNT(*) AS n FROM jobs GROUP BY status").all() as { status: string; n: number }[];
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}
