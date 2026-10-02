"use server";

import { GoalSchema, TargetSchema } from "@career-os/shared";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { ActionResult } from "./profile";

function refresh() {
  revalidatePath("/", "layout");
}

export async function addGoal(input: { title: string; why?: string; targetDate?: string | null }): Promise<ActionResult> {
  const parsed = GoalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Give the goal a title." };
  db()
    .prepare("INSERT INTO goals (title, why, target_date) VALUES (?, ?, ?)")
    .run(parsed.data.title.trim(), parsed.data.why.trim(), parsed.data.targetDate || null);
  refresh();
  return { ok: true };
}

export async function toggleGoal(id: number, done: boolean): Promise<ActionResult> {
  db().prepare("UPDATE goals SET done = ? WHERE id = ?").run(done ? 1 : 0, id);
  refresh();
  return { ok: true };
}

export async function deleteGoal(id: number): Promise<ActionResult> {
  db().prepare("DELETE FROM goals WHERE id = ?").run(id);
  refresh();
  return { ok: true };
}

export async function setTarget(input: { metric: string; goalValue: number }): Promise<ActionResult> {
  const parsed = TargetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pick a number above zero." };
  db()
    .prepare("INSERT INTO targets (metric, goal_value) VALUES (?, ?) ON CONFLICT(metric) DO UPDATE SET goal_value = excluded.goal_value")
    .run(parsed.data.metric, parsed.data.goalValue);
  refresh();
  return { ok: true };
}

export async function deleteTarget(id: number): Promise<ActionResult> {
  db().prepare("DELETE FROM targets WHERE id = ?").run(id);
  refresh();
  return { ok: true };
}
