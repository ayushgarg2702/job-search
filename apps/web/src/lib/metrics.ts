import "server-only";
import { FUNNEL_STAGES, TARGET_METRICS, type JobStatus, type TargetMetric } from "@career-os/shared";
import { db } from "./db";

/** SQLite expressions in local time (the app runs on your machine, so that's IST for most users). */
const WEEK_START = "date('now', 'localtime', 'weekday 0', '-6 days')";
const MONTH_START = "date('now', 'localtime', 'start of month')";

function scalar(sql: string, ...args: unknown[]): number {
  const row = db().prepare(sql).get(...args) as { n: number | null } | undefined;
  return row?.n ?? 0;
}

export function metricValue(metric: TargetMetric): number {
  switch (metric) {
    case "applications_week":
      return scalar(
        `SELECT COUNT(DISTINCT job_id) AS n FROM job_events WHERE status = 'submitted' AND date(at, 'localtime') >= ${WEEK_START}`,
      );
    case "interviews_month":
      return scalar(
        `SELECT COUNT(DISTINCT job_id) AS n FROM job_events WHERE status = 'interviewing' AND date(at, 'localtime') >= ${MONTH_START}`,
      );
    case "study_minutes_week":
      return scalar(
        `SELECT SUM(minutes) AS n FROM practice_logs WHERE kind = 'study' AND date(at, 'localtime') >= ${WEEK_START}`,
      );
    case "mock_interviews_week":
      return scalar(
        `SELECT COUNT(*) AS n FROM interview_sessions WHERE finished_at IS NOT NULL AND date(finished_at, 'localtime') >= ${WEEK_START}`,
      );
  }
}

export type TargetProgress = {
  id: number;
  metric: TargetMetric;
  label: string;
  unit: string;
  goalValue: number;
  current: number;
};

export function targetProgress(): TargetProgress[] {
  const rows = db().prepare("SELECT id, metric, goal_value FROM targets ORDER BY id").all() as {
    id: number;
    metric: TargetMetric;
    goal_value: number;
  }[];
  return rows.map((r) => {
    const meta = TARGET_METRICS.find((m) => m.id === r.metric)!;
    return { id: r.id, metric: r.metric, label: meta.label, unit: meta.unit, goalValue: r.goal_value, current: metricValue(r.metric) };
  });
}

/** Days in a row (ending today or yesterday) with at least one real step. */
export function activityStreak(): number {
  const days = db()
    .prepare(`
      SELECT DISTINCT d FROM (
        SELECT date(at, 'localtime') AS d FROM job_events WHERE status IN ('submitted','autofilling','declined','interviewing')
        UNION SELECT date(at, 'localtime') FROM practice_logs
        UNION SELECT date(at, 'localtime') FROM motivation_entries
        UNION SELECT date(finished_at, 'localtime') FROM interview_sessions WHERE finished_at IS NOT NULL
      ) ORDER BY d DESC LIMIT 400`)
    .all() as { d: string }[];
  const set = new Set(days.map((r) => r.d));
  const day = new Date();
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (!set.has(fmt(day))) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (set.has(fmt(day))) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

export function funnel() {
  const counts = db().prepare("SELECT status, COUNT(*) AS n FROM jobs GROUP BY status").all() as { status: JobStatus; n: number }[];
  return FUNNEL_STAGES.map((stage) => ({
    stage: stage.label,
    count: counts.filter((c) => stage.from.includes(c.status)).reduce((a, c) => a + c.n, 0),
  }));
}

const SENT = "('autofilling','ready_to_submit','submitted','interviewing','offer','rejected')";

export function sentBy(column: "city" | "source" | "company", limit = 10) {
  return db()
    .prepare(`SELECT ${column} AS key, COUNT(*) AS n FROM jobs WHERE status IN ${SENT} GROUP BY ${column} ORDER BY n DESC LIMIT ?`)
    .all(limit) as { key: string; n: number }[];
}

export function weeklySent(weeks = 8) {
  const rows = db()
    .prepare(`
      SELECT date(at, 'localtime', 'weekday 0', '-6 days') AS week, COUNT(DISTINCT job_id) AS n
      FROM job_events WHERE status = 'submitted'
        AND date(at, 'localtime') >= date('now', 'localtime', ?)
      GROUP BY week ORDER BY week`)
    .all(`-${weeks * 7} days`) as { week: string; n: number }[];
  const map = new Map(rows.map((r) => [r.week, r.n]));
  const out: { week: string; sent: number }[] = [];
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(monday);
    d.setDate(d.getDate() - i * 7);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out.push({ week: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), sent: map.get(key) ?? 0 });
  }
  return out;
}

export function outcomeByCity() {
  return db()
    .prepare(`
      SELECT city AS key,
        SUM(CASE WHEN status IN ${SENT} THEN 1 ELSE 0 END) AS sent,
        SUM(CASE WHEN status IN ('interviewing','offer') THEN 1 ELSE 0 END) AS interviews
      FROM jobs GROUP BY city HAVING sent > 0 ORDER BY sent DESC LIMIT 10`)
    .all() as { key: string; sent: number; interviews: number }[];
}
