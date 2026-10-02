"use server";

import { buildRoadmap } from "@career-os/engine";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { mainGoal } from "@/lib/goals";
import { skillGaps } from "@/lib/learning";
import type { ActionResult } from "./profile";

function refresh() {
  revalidatePath("/", "layout");
}

export async function addLearningItem(input: { skill: string; title?: string }): Promise<ActionResult> {
  const skill = input.skill.trim();
  if (!skill) return { ok: false, error: "Name the skill." };
  const exists = db().prepare("SELECT id FROM learning_items WHERE lower(skill) = lower(?) AND status != 'done'").get(skill);
  if (exists) return { ok: false, error: `${skill} is already on your list.` };
  db().prepare("INSERT INTO learning_items (skill, title) VALUES (?, ?)").run(skill, input.title?.trim() || `Learn ${skill}`);
  refresh();
  return { ok: true };
}

export async function setLearningStatus(id: number, status: string): Promise<ActionResult> {
  const parsed = z.enum(["todo", "doing", "done"]).safeParse(status);
  if (!parsed.success) return { ok: false, error: "Bad status" };
  db().prepare("UPDATE learning_items SET status = ? WHERE id = ?").run(parsed.data, id);
  refresh();
  return { ok: true };
}

export async function deleteLearningItem(id: number): Promise<ActionResult> {
  db().prepare("DELETE FROM learning_items WHERE id = ?").run(id);
  refresh();
  return { ok: true };
}

export async function logStudy(input: { minutes: number; note?: string; itemId?: number | null }): Promise<ActionResult> {
  const minutes = Math.round(input.minutes);
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 600) return { ok: false, error: "Enter minutes between 1 and 600." };
  db()
    .prepare("INSERT INTO practice_logs (learning_item_id, kind, minutes, note) VALUES (?, 'study', ?, ?)")
    .run(input.itemId ?? null, minutes, input.note?.trim() ?? "");
  if (input.itemId) db().prepare("UPDATE learning_items SET status = 'doing' WHERE id = ? AND status = 'todo'").run(input.itemId);
  refresh();
  return { ok: true, message: `Logged ${minutes} minutes.` };
}

export async function generateRoadmap(): Promise<ActionResult> {
  const goal = mainGoal();
  if (!goal) return { ok: false, error: "Add a goal first. The roadmap is built around it." };
  const items = buildRoadmap(goal.title, skillGaps(5));
  const tx = db().transaction(() => {
    db().prepare("DELETE FROM roadmap_items WHERE done = 0").run();
    const insert = db().prepare("INSERT INTO roadmap_items (phase, phase_title, title, detail, position) VALUES (?, ?, ?, ?, ?)");
    items.forEach((it, i) => insert.run(it.phase, it.phaseTitle, it.title, it.detail, i));
  });
  tx();
  refresh();
  return { ok: true, message: "Roadmap built. Edit anything that doesn't fit." };
}

export async function toggleRoadmapItem(id: number, done: boolean): Promise<ActionResult> {
  db().prepare("UPDATE roadmap_items SET done = ? WHERE id = ?").run(done ? 1 : 0, id);
  refresh();
  return { ok: true };
}

export async function addRoadmapItem(input: { phase: number; title: string; detail?: string }): Promise<ActionResult> {
  if (!input.title.trim()) return { ok: false, error: "Give the step a title." };
  const phaseTitle =
    (db().prepare("SELECT phase_title FROM roadmap_items WHERE phase = ? LIMIT 1").get(input.phase) as { phase_title: string } | undefined)
      ?.phase_title ?? `Phase ${input.phase}`;
  const pos = (db().prepare("SELECT COALESCE(MAX(position), 0) + 1 AS p FROM roadmap_items").get() as { p: number }).p;
  db()
    .prepare("INSERT INTO roadmap_items (phase, phase_title, title, detail, position) VALUES (?, ?, ?, ?, ?)")
    .run(input.phase, phaseTitle, input.title.trim(), input.detail?.trim() ?? "", pos);
  refresh();
  return { ok: true };
}

export async function deleteRoadmapItem(id: number): Promise<ActionResult> {
  db().prepare("DELETE FROM roadmap_items WHERE id = ?").run(id);
  refresh();
  return { ok: true };
}

export async function checkIn(): Promise<ActionResult> {
  const already = db()
    .prepare("SELECT id FROM motivation_entries WHERE kind = 'checkin' AND date(at, 'localtime') = date('now', 'localtime')")
    .get();
  if (!already) db().prepare("INSERT INTO motivation_entries (kind, text) VALUES ('checkin', 'I can do it')").run();
  refresh();
  return { ok: true, message: already ? "Already checked in today. Go do one thing." : "Checked in. Now do one thing." };
}

export async function addWin(text: string): Promise<ActionResult> {
  if (!text.trim()) return { ok: false, error: "Write the win down." };
  db().prepare("INSERT INTO motivation_entries (kind, text) VALUES ('win', ?)").run(text.trim().slice(0, 300));
  refresh();
  return { ok: true };
}
