"use server";

import { SearchConfigSchema, type SearchConfig } from "@career-os/shared";
import { revalidatePath } from "next/cache";
import { pipelineState, runFetch } from "@/lib/pipeline";
import { getProfile, getSearchConfig, getSettings, saveSearchConfig } from "@/lib/store";
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
  const cfg = getSearchConfig();
  const profile = getProfile();
  if (!cfg.searchTerms.length && !profile.targetTitles.length) {
    return { ok: false, error: "Add at least one target job title on your Resume page first." };
  }
  void runFetch().then(() => revalidatePath("/", "layout"));
  const labels = cfg.searchTerms.length ? cfg.searchTerms : profile.targetTitles;
  return {
    ok: true,
    message: `Searching for ${labels.slice(0, 3).join(", ")}${labels.length > 3 ? "…" : ""}. New jobs land in your inbox as they are scored.`,
  };
}

/** Opens Naukri in the helper browser so you can solve captcha / log in once. */
export async function unlockNaukri(): Promise<ActionResult> {
  const url = getSettings().browserWorkerUrl;
  try {
    const res = await fetch(`${url}/unlock/naukri`, { method: "POST", signal: AbortSignal.timeout(90_000) });
    const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
    if (!res.ok) return { ok: false, error: data.error || `Browser worker said ${res.status}` };
    return {
      ok: true,
      message:
        data.message ||
        "Helper browser opened Naukri. Solve captcha or log in, then press Search now.",
    };
  } catch (err) {
    return {
      ok: false,
      error: `Could not reach the browser worker (${(err as Error).message}). Start it with: pnpm worker:browser`,
    };
  }
}
