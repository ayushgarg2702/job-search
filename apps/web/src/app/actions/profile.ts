"use server";

import { parseResume } from "@career-os/engine";
import { ProfileSchema, type Profile } from "@career-os/shared";
import { revalidatePath } from "next/cache";
import { rescoreOpen } from "@/lib/pipeline";
import { readResumeText } from "@/lib/resume-file";
import { getProfile, saveProfile } from "@/lib/store";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

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
    saveProfile({
      ...parsed,
      name: keep("name") as string,
      email: keep("email") as string,
      phone: keep("phone") as string,
      city: current.city || parsed.city || "Bengaluru",
      skills: [...new Set([...(parsed.skills ?? []), ...current.skills])],
      targetTitles: current.targetTitles.length ? current.targetTitles : parsed.headline ? [parsed.headline] : [],
      resumeText: text,
      resumeFileName: file.name,
    });
    rescoreOpen();
    revalidatePath("/", "layout");
    return { ok: true, message: "Resume read. Check the fields below and fix anything it got wrong." };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function updateProfile(patch: Partial<Profile>): Promise<ActionResult> {
  const parsed = ProfileSchema.partial().safeParse(patch);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid profile" };
  saveProfile(parsed.data);
  rescoreOpen();
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}
