import type { Profile } from "@career-os/shared";
import { normalizeCity } from "@career-os/shared";
import { extractSkills, hasSkill } from "./skills";
import { titleOverlapScore } from "./titles";

export type JobLike = {
  title: string;
  company: string;
  location: string;
  description: string;
  salaryMaxInr?: number | null;
  isRemote?: boolean;
};

export type Evaluation = {
  score: number;
  matched: string[];
  missing: string[];
  blockers: string[];
  reasons: string[];
  yearsRequired: number | null;
};

const YEARS_RE = /(\d{1,2})\s*(?:\+|-\s*\d{1,2})?\s*(?:years?|yrs?)/gi;

export function yearsRequired(description: string): number | null {
  let min: number | null = null;
  for (const m of description.matchAll(YEARS_RE)) {
    const n = Number(m[1]);
    if (n > 0 && n < 30 && (min === null || n < min)) min = n;
  }
  return min;
}

/**
 * Plain, explainable fit score (0-100). No model call: it runs on every fetched
 * job, so it has to be fast and free. The deep agents only run on jobs that pass.
 */
export function scoreJob(profile: Profile, job: JobLike): Evaluation {
  const jdSkills = extractSkills(`${job.title}\n${job.description}`);
  const matched = jdSkills.filter((s) => hasSkill(profile.skills, s));
  const missing = jdSkills.filter((s) => !hasSkill(profile.skills, s));
  const reasons: string[] = [];
  const blockers: string[] = [];

  const skillRatio = jdSkills.length ? matched.length / jdSkills.length : 0.4;
  const titleRatio = titleOverlapScore(job.title, profile.targetTitles);

  const city = normalizeCity(job.location);
  const remote = job.isRemote || city === "Remote (India)";
  const prefersRemote = profile.preferredCities.includes("Remote (India)");
  const cityOk =
    profile.preferredCities.length === 0 ||
    profile.preferredCities.includes(city) ||
    (remote && prefersRemote);

  const yrs = yearsRequired(job.description);
  let yearsFactor = 1;
  if (yrs !== null && profile.yearsExperience > 0) {
    const gap = yrs - profile.yearsExperience;
    if (gap >= 3) {
      yearsFactor = 0.3;
      blockers.push(`Asks for ${yrs}+ years; you have ${profile.yearsExperience}.`);
    } else if (gap > 0) {
      yearsFactor = 0.7;
      reasons.push(`Asks for ${yrs} years; you have ${profile.yearsExperience}. Close enough to try.`);
    } else {
      reasons.push(`Experience fits (${yrs}+ asked, you have ${profile.yearsExperience}).`);
    }
  }

  if (
    job.salaryMaxInr &&
    profile.expectedCtcInr &&
    job.salaryMaxInr < profile.expectedCtcInr * 0.8
  ) {
    blockers.push("Listed pay is well below your expected CTC.");
  }

  if (!cityOk) reasons.push(`Location is ${city}, not in your preferred cities.`);
  else reasons.push(remote ? "Remote role." : `In ${city}.`);

  if (matched.length) reasons.unshift(`You match ${matched.length} of ${jdSkills.length} skills it mentions.`);
  if (titleRatio >= 0.6) reasons.push("Title lines up with what you are targeting.");
  else if (profile.targetTitles.length) blockers.push("Title does not match your target roles.");

  const raw =
    skillRatio * 55 + titleRatio * 25 + (cityOk ? 12 : 0) + 8 * yearsFactor - blockers.length * 12;
  const score = Math.max(0, Math.min(100, Math.round(raw * (0.6 + 0.4 * yearsFactor))));

  return { score, matched, missing, blockers, reasons, yearsRequired: yrs };
}
