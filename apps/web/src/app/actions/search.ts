"use server";

import { SearchConfigSchema, type SearchConfig } from "@career-os/shared";
import { revalidatePath } from "next/cache";
import { pipelineState, runFetch } from "@/lib/pipeline";
import { saveSearchConfig } from "@/lib/store";
import type { ActionResult } from "./profile";

export async function updateSearchConfig(patch: Partial<SearchConfig>): Promise<ActionResult> {
  const parsed = SearchConfigSchema.partial().safeParse(patch);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings" };
  saveSearchConfig(parsed.data);
  revalidatePath("/connections");
  return { ok: true };
}

export async function startSearch(): Promise<ActionResult> {
  if (pipelineState().fetching) return { ok: false, error: "A search is already running." };
  void runFetch().then(() => revalidatePath("/", "layout"));
  return { ok: true, message: "Searching. New jobs land in your inbox as they are scored." };
}
