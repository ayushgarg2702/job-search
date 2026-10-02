import "server-only";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

export const DATA_DIR = process.env.CAREER_OS_DATA_DIR
  ? path.resolve(process.env.CAREER_OS_DATA_DIR)
  : path.resolve(process.cwd(), "../../data");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  why TEXT NOT NULL DEFAULT '',
  target_date TEXT,
  done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric TEXT NOT NULL UNIQUE,
  goal_value INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fingerprint TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  external_id TEXT,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT 'Unknown',
  url TEXT NOT NULL,
  apply_url TEXT,
  description TEXT NOT NULL DEFAULT '',
  salary_min INTEGER,
  salary_max INTEGER,
  is_remote INTEGER NOT NULL DEFAULT 0,
  posted_at TEXT,
  status TEXT NOT NULL DEFAULT 'discovered',
  score INTEGER,
  evaluation TEXT,
  decline_reason TEXT,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS jobs_status ON jobs(status);
CREATE TABLE IF NOT EXISTS job_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS job_events_job ON job_events(job_id);
CREATE TABLE IF NOT EXISTS drafts (
  job_id INTEGER PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
  pack TEXT NOT NULL,
  source TEXT NOT NULL,
  steps TEXT NOT NULL DEFAULT '[]',
  voice TEXT NOT NULL DEFAULT '[]',
  provenance TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS apply_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  screenshot TEXT,
  filled TEXT NOT NULL DEFAULT '[]',
  skipped TEXT NOT NULL DEFAULT '[]',
  warnings TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS learning_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS practice_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learning_item_id INTEGER REFERENCES learning_items(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  minutes INTEGER NOT NULL DEFAULT 0,
  score INTEGER,
  note TEXT NOT NULL DEFAULT '',
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS roadmap_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phase INTEGER NOT NULL,
  phase_title TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  done INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS interview_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  track TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  questions TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  avg_score INTEGER
);
CREATE TABLE IF NOT EXISTS interview_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  feedback TEXT NOT NULL,
  score INTEGER NOT NULL,
  seconds INTEGER NOT NULL DEFAULT 0,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS motivation_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS fetch_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  found INTEGER NOT NULL DEFAULT 0,
  added INTEGER NOT NULL DEFAULT 0,
  log TEXT NOT NULL DEFAULT '[]'
);
`;

const globalForDb = globalThis as unknown as { __careerDb?: Database.Database };

export function db(): Database.Database {
  if (!globalForDb.__careerDb) {
    mkdirSync(DATA_DIR, { recursive: true });
    const conn = new Database(path.join(DATA_DIR, "career.db"));
    conn.pragma("journal_mode = WAL");
    conn.pragma("foreign_keys = ON");
    conn.exec(SCHEMA);
    globalForDb.__careerDb = conn;
  }
  return globalForDb.__careerDb;
}

export function getKv<T>(key: string, fallback: T): T {
  const row = db().prepare("SELECT value FROM kv WHERE key = ?").get(key) as { value: string } | undefined;
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export function setKv(key: string, value: unknown) {
  db()
    .prepare("INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(key, JSON.stringify(value));
}
