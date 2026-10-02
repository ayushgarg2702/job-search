import "server-only";
import { db } from "./db";

export type Goal = { id: number; title: string; why: string; target_date: string | null; done: number; created_at: string };

export function listGoals(): Goal[] {
  return db().prepare("SELECT * FROM goals ORDER BY done ASC, id DESC").all() as Goal[];
}

export function mainGoal(): Goal | null {
  return (db().prepare("SELECT * FROM goals WHERE done = 0 ORDER BY id ASC LIMIT 1").get() as Goal | undefined) ?? null;
}
