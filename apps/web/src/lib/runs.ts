import "server-only";
import { db } from "./db";

export type FetchRun = {
  id: number;
  started_at: string;
  finished_at: string | null;
  found: number;
  added: number;
  log: { source: string; found: number; error?: string }[];
};

export function recentRuns(limit = 5): FetchRun[] {
  const rows = db().prepare("SELECT * FROM fetch_runs ORDER BY id DESC LIMIT ?").all(limit) as (Omit<FetchRun, "log"> & { log: string })[];
  return rows.map((r) => ({ ...r, log: JSON.parse(r.log) }));
}

export function lastRunAt(): Date | null {
  const row = db().prepare("SELECT started_at FROM fetch_runs ORDER BY id DESC LIMIT 1").get() as { started_at: string } | undefined;
  return row ? new Date(`${row.started_at}Z`) : null;
}
