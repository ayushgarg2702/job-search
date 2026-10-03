"use server";

import { generateLearnPlan } from "@career-os/agents";
import { buildRoadmap, mergeResources, type LearnResource } from "@career-os/engine";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { mainGoal } from "@/lib/goals";
import { skillGaps } from "@/lib/learning";
import { getProfile, getSettings } from "@/lib/store";
import type { ActionResult } from "./profile";

function refresh() {
  revalidatePath("/", "layout");
}

function resourcesJson(skill: string, resources?: LearnResource[]) {
  return JSON.stringify(mergeResources(skill, resources ?? []));
}

export async function addLearningItem(input: {
  skill: string;
  title?: string;
  notes?: string;
  resources?: LearnResource[];
}): Promise<ActionResult> {
  const skill = input.skill.trim();
  if (!skill) return { ok: false, error: "Name the skill." };
  const exists = db().prepare("SELECT id FROM learning_items WHERE lower(skill) = lower(?) AND status != 'done'").get(skill);
  if (exists) return { ok: false, error: `${skill} is already on your list.` };
  db()
    .prepare("INSERT INTO learning_items (skill, title, notes, resources) VALUES (?, ?, ?, ?)")
    .run(skill, input.title?.trim() || `Learn ${skill}`, input.notes?.trim() ?? "", resourcesJson(skill, input.resources));
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

export async function generateLearningPlan(): Promise<ActionResult> {
  const profile = getProfile();
  const gaps = skillGaps(12);
  if (!profile.targetTitles.length && gaps.length === 0) {
    return { ok: false, error: "Add target job titles on Resume, or run a search first so gaps appear." };
  }
  const plan = await generateLearnPlan({
    targetTitles: profile.targetTitles,
    skills: profile.skills,
    gaps,
    goal: mainGoal()?.title,
    model: getSettings().cursorModel || undefined,
  });

  const tx = db().transaction(() => {
    const insertLearn = db().prepare("INSERT INTO learning_items (skill, title, notes, resources) VALUES (?, ?, ?, ?)");
    const updateLearn = db().prepare(
      "UPDATE learning_items SET title = ?, notes = ?, resources = ? WHERE id = ? AND status != 'done'",
    );
    for (const item of plan.learning) {
      const existing = db()
        .prepare("SELECT id FROM learning_items WHERE lower(skill) = lower(?) AND status != 'done'")
        .get(item.skill) as { id: number } | undefined;
      const resJson = resourcesJson(item.skill, item.resources);
      if (existing) updateLearn.run(item.title, item.notes, resJson, existing.id);
      else insertLearn.run(item.skill, item.title, item.notes, resJson);
    }
    db().prepare("DELETE FROM roadmap_items WHERE done = 0").run();
    const insertRoad = db().prepare(
      "INSERT INTO roadmap_items (phase, phase_title, title, detail, position) VALUES (?, ?, ?, ?, ?)",
    );
    plan.roadmap.forEach((it, i) => insertRoad.run(it.phase, it.phaseTitle, it.title, it.detail, i));
  });
  tx();
  refresh();
  return {
    ok: true,
    message:
      plan.source === "cursor"
        ? "Learning plan ready with videos and practice links. Open any link to start."
        : "Learning plan ready with curated videos and practice sites. Open any link to start.",
  };
}

export async function generateRoadmap(): Promise<ActionResult> {
  const profile = getProfile();
  const goal = mainGoal()?.title || profile.targetTitles[0] || "Land a matching role";
  const gaps = skillGaps(5);
  if (!profile.targetTitles.length && gaps.length === 0 && !mainGoal()) {
    return { ok: false, error: "Add a target title on Resume or run a search first." };
  }
  return generateLearningPlan().then((res) => {
    if (res.ok) return res;
    const items = buildRoadmap(goal, gaps);
    const tx = db().transaction(() => {
      db().prepare("DELETE FROM roadmap_items WHERE done = 0").run();
      const insert = db().prepare(
        "INSERT INTO roadmap_items (phase, phase_title, title, detail, position) VALUES (?, ?, ?, ?, ?)",
      );
      items.forEach((it, i) => insert.run(it.phase, it.phaseTitle, it.title, it.detail, i));
    });
    tx();
    refresh();
    return { ok: true, message: "Roadmap built from your gaps. Edit anything that doesn't fit." };
  });
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
