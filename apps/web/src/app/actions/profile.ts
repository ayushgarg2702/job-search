"use server";

import { cleanTargetTitles, parseResume, searchTermsFromTitles } from "@career-os/engine";
import { ProfileSchema, type Profile } from "@career-os/shared";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { rescoreOpen, runFetch } from "@/lib/pipeline";
import { readResumeText } from "@/lib/resume-file";
import { getProfile, getSearchConfig, saveProfile, saveSearchConfig } from "@/lib/store";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

function syncSearchFromProfile(profile: Profile) {
  const titles = cleanTargetTitles(profile.targetTitles);
  if (!titles.length) return;
  const cfg = getSearchConfig();
  const terms = searchTermsFromTitles(titles);
  const locations =
    profile.preferredCities.length > 0
      ? profile.preferredCities.map((c) => (c === "Remote (India)" ? "Remote" : c))
      : profile.city
        ? [profile.city, "Remote"]
        : cfg.locations;
  saveSearchConfig({
    searchTerms: terms.length ? terms : titles,
    locations: locations.length ? locations : cfg.locations,
  });
}

function neverSearched(): boolean {
  return (db().prepare("SELECT COUNT(*) AS n FROM fetch_runs").get() as { n: number }).n === 0;
}

export async function uploadResume(formData: FormData): Promise<ActionResult> {
  const file = formData.get("resume");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pick a file first." };
  if (file.size > 8 * 1024 * 1024) return { ok: false, error: "That file is over 8 MB." };
  try {
    const { text } = await readResumeText(file);
    if (text.length < 80) {
      return { ok: false, error: "Could not read text from that file. If it is a scanned PDF, export it as text-based PDF or DOCX." };
    }
    const parsed = parseResume(text);
    const current = getProfile();
    const keep = <K extends keyof Profile>(k: K) => (current[k] && String(current[k]).length ? current[k] : parsed[k]);
    const fromExp = (parsed.experience ?? [])
      .map((e) => e.title)
      .filter((t) => t && !/professional summary|summary|objective/i.test(t));
    const seededTitles = cleanTargetTitles(
      current.targetTitles.length
        ? current.targetTitles
        : [...(parsed.headline ? [parsed.headline] : []), ...fromExp].slice(0, 4),
    );
    const profile = saveProfile({
      ...parsed,
      name: keep("name") as string,
      email: keep("email") as string,
      phone: keep("phone") as string,
      city: current.city || parsed.city || "Bengaluru",
      skills: [...new Set([...(parsed.skills ?? []), ...current.skills])],
      targetTitles: seededTitles,
      resumeText: text,
      resumeFileName: file.name,
    });
    syncSearchFromProfile(profile);
    rescoreOpen();

    let message = "Resume read. Check the fields below and fix anything it got wrong.";
    if (profile.targetTitles.length && neverSearched()) {
      void runFetch().then(() => revalidatePath("/", "layout"));
      message = `Resume read. Searching for ${profile.targetTitles.join(", ")}… Check your Inbox in a minute.`;
    } else if (!profile.targetTitles.length) {
      message = "Resume read. Add the job titles you want (e.g. Sr. SDE), then search.";
    }

    revalidatePath("/", "layout");
    return { ok: true, message };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function updateProfile(patch: Partial<Profile>): Promise<ActionResult> {
  const parsed = ProfileSchema.partial().safeParse(patch);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid profile" };
  const data = { ...parsed.data };
  if (data.targetTitles) data.targetTitles = cleanTargetTitles(data.targetTitles);
  const profile = saveProfile(data);
  if (data.targetTitles || data.preferredCities || data.city) syncSearchFromProfile(profile);
  rescoreOpen();
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}
