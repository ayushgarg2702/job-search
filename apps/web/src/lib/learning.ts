import "server-only";
import type { GapCount } from "@career-os/engine";
import { db } from "./db";
import { listJobs } from "./jobs";

export type LearningItem = { id: number; skill: string; title: string; notes: string; status: "todo" | "doing" | "done"; minutes: number };

/** Skills that keep showing up in jobs you could apply for but are not on your resume. */
export function skillGaps(limit = 12): GapCount[] {
  const counts = new Map<string, number>();
  for (const job of listJobs(["scored", "drafting", "draft_ready", "awaiting_approval", "autofilling", "ready_to_submit", "submitted", "interviewing", "rejected"], 2000)) {
    for (const s of job.evaluation?.missing ?? []) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([skill, jobs]) => ({ skill, jobs }))
    .sort((a, b) => b.jobs - a.jobs)
    .slice(0, limit);
}

export function listLearning(): LearningItem[] {
  return db()
    .prepare(`
      SELECT l.*, COALESCE(SUM(p.minutes), 0) AS minutes
      FROM learning_items l LEFT JOIN practice_logs p ON p.learning_item_id = l.id
      GROUP BY l.id
      ORDER BY CASE l.status WHEN 'doing' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END, l.id DESC`)
    .all() as LearningItem[];
}

export function studyByDay(days = 28) {
  const rows = db()
    .prepare(`
      SELECT date(at, 'localtime') AS d, SUM(minutes) AS m FROM practice_logs
      WHERE kind = 'study' AND date(at, 'localtime') >= date('now', 'localtime', ?)
      GROUP BY d`)
    .all(`-${days - 1} days`) as { d: string; m: number }[];
  const map = new Map(rows.map((r) => [r.d, r.m]));
  const out: { day: string; minutes: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out.push({ day: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), minutes: map.get(key) ?? 0 });
  }
  return out;
}

export function mockScoreTrend(limit = 12) {
  const rows = db()
    .prepare("SELECT finished_at, avg_score, track FROM interview_sessions WHERE finished_at IS NOT NULL ORDER BY id DESC LIMIT ?")
    .all(limit) as { finished_at: string; avg_score: number; track: string }[];
  return rows.reverse().map((r, i) => ({
    n: `#${i + 1}`,
    score: r.avg_score,
    date: new Date(`${r.finished_at}Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
  }));
}

export function studyTotals() {
  const row = db()
    .prepare(`
      SELECT COALESCE(SUM(minutes), 0) AS total,
        COALESCE(SUM(CASE WHEN date(at, 'localtime') >= date('now', 'localtime', 'weekday 0', '-6 days') THEN minutes END), 0) AS week,
        COUNT(*) AS sessions
      FROM practice_logs WHERE kind = 'study'`)
    .get() as { total: number; week: number; sessions: number };
  return row;
}

export function recentPractice(limit = 8) {
  return db()
    .prepare(`
      SELECT p.id, p.minutes, p.note, p.at, l.title AS item FROM practice_logs p
      LEFT JOIN learning_items l ON l.id = p.learning_item_id
      WHERE p.kind = 'study' ORDER BY p.id DESC LIMIT ?`)
    .all(limit) as { id: number; minutes: number; note: string; at: string; item: string | null }[];
}
