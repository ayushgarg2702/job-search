"use server";

import { cursorStatus } from "@career-os/agents";
import { SettingsSchema, type Settings } from "@career-os/shared";
import { revalidatePath } from "next/cache";
import { rescoreOpen } from "@/lib/pipeline";
import { saveSettings } from "@/lib/store";
import type { ActionResult } from "./profile";

export async function updateSettings(patch: Partial<Settings>): Promise<ActionResult> {
  const parsed = SettingsSchema.partial().safeParse(patch);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings" };
  saveSettings(parsed.data);
  rescoreOpen();
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function checkCursor() {
  return cursorStatus();
}
