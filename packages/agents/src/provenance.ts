import { extractSkills, hasSkill } from "@career-os/engine";
import type { Profile } from "@career-os/shared";

export type ProvenanceIssue = { kind: "number" | "skill"; value: string; context: string };

function sourceText(profile: Profile): string {
  return [
    profile.resumeText,
    profile.summary,
    profile.headline,
    profile.skills.join(" "),
    ...profile.experience.flatMap((e) => [e.title, e.company, e.start, e.end, ...e.bullets]),
    ...profile.education,
    String(profile.yearsExperience),
    profile.currentCtcInr ? String(profile.currentCtcInr) : "",
    profile.expectedCtcInr ? String(profile.expectedCtcInr) : "",
    profile.noticePeriodDays ? String(profile.noticePeriodDays) : "",
  ].join("\n");
}

function sentenceAround(text: string, index: number): string {
  const start = Math.max(text.lastIndexOf(".", index) + 1, text.lastIndexOf("\n", index) + 1, 0);
  const endDot = text.indexOf(".", index);
  const endNl = text.indexOf("\n", index);
  const ends = [endDot, endNl].filter((n) => n !== -1);
  const end = ends.length ? Math.min(...ends) + 1 : text.length;
  return text.slice(start, end).trim();
}

/**
 * Every number and every skill in a draft has to exist in what you gave us.
 * Anything else is flagged so it can be cut before you see the draft.
 */
export function checkProvenance(draft: string, profile: Profile, jobText = ""): ProvenanceIssue[] {
  const source = sourceText(profile);
  const sourceNumbers = new Set((source.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(/,/g, "")));
  const jobNumbers = new Set((jobText.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(/,/g, "")));
  const issues: ProvenanceIssue[] = [];

  for (const m of draft.matchAll(/\d+(?:[.,]\d+)?/g)) {
    const n = m[0].replace(/,/g, "");
    if (n.length === 4 && /^(19|20)\d\d$/.test(n) && sourceNumbers.has(n)) continue;
    if (sourceNumbers.has(n) || jobNumbers.has(n)) continue;
    if (Number(n) <= 1) continue;
    issues.push({ kind: "number", value: m[0], context: sentenceAround(draft, m.index ?? 0) });
  }

  const sourceSkills = extractSkills(source);
  for (const skill of extractSkills(draft)) {
    if (sourceSkills.includes(skill) || hasSkill(profile.skills, skill)) continue;
    issues.push({ kind: "skill", value: skill, context: `Draft claims ${skill}, which is not in your resume.` });
  }
  return issues;
}

/** Drops sentences that carry a flagged claim. Used only as a last resort. */
export function stripIssues(text: string, issues: ProvenanceIssue[]): string {
  let out = text;
  for (const issue of issues) {
    if (issue.kind === "number" && issue.context && out.includes(issue.context)) {
      out = out.replace(issue.context, "");
    }
  }
  return out.replace(/\n{3,}/g, "\n\n").replace(/ {2,}/g, " ").trim();
}
