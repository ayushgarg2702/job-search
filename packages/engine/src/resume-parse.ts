import type { Profile } from "@career-os/shared";
import { extractSkills } from "./skills";

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+\/?/i;
const GITHUB_RE = /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+\/?/i;
const YEARS_RE = /(\d{1,2}(?:\.\d)?)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)/i;
const DATE_RANGE_RE =
  /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*\d{4}|\d{1,2}\/\d{4}|\d{4})\s*(?:-|–|—|to)\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*\d{4}|\d{1,2}\/\d{4}|\d{4}|present|current|now|till date)/i;

const SECTION_RE = /^(experience|work experience|professional experience|employment|education|skills|technical skills|projects|certifications|summary|profile|achievements)\b/i;

function cleanLines(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function yearsFromRanges(text: string): number {
  let months = 0;
  const now = new Date();
  for (const line of text.split("\n")) {
    const m = line.match(DATE_RANGE_RE);
    if (!m) continue;
    const start = Date.parse(m[1].replace(/(\d{1,2})\/(\d{4})/, "$2-$1-01"));
    const endRaw = m[2];
    const end = /present|current|now|till/i.test(endRaw)
      ? now.getTime()
      : Date.parse(endRaw.replace(/(\d{1,2})\/(\d{4})/, "$2-$1-01"));
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      months += (end - start) / (1000 * 60 * 60 * 24 * 30.4);
    }
  }
  return Math.round((months / 12) * 10) / 10;
}

/**
 * Pulls the obvious fields out of resume text. It does not try to be clever:
 * whatever it gets wrong you fix once on the profile page.
 */
export function parseResume(text: string): Partial<Profile> {
  const lines = cleanLines(text);
  const email = text.match(EMAIL_RE)?.[0] ?? "";
  const phone = text.match(PHONE_RE)?.[0]?.replace(/\s|-/g, "") ?? "";
  const linkedin = text.match(LINKEDIN_RE)?.[0] ?? "";
  const github = text.match(GITHUB_RE)?.[0] ?? "";

  const name =
    lines.find(
      (l) =>
        l.length < 40 &&
        !EMAIL_RE.test(l) &&
        !PHONE_RE.test(l) &&
        /^[A-Za-z][A-Za-z .'-]+$/.test(l) &&
        l.split(" ").length <= 4,
    ) ?? "";

  const statedYears = Number(text.match(YEARS_RE)?.[1] ?? 0);
  const yearsExperience = statedYears || yearsFromRanges(text);

  const experience: Profile["experience"] = [];
  let section = "";
  let current: Profile["experience"][number] | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const sec = line.match(SECTION_RE);
    if (sec && line.length < 40) {
      section = sec[1].toLowerCase();
      current = null;
      continue;
    }
    if (!/experience|employment/.test(section)) continue;
    const range = line.match(DATE_RANGE_RE);
    if (range) {
      const header = line.replace(DATE_RANGE_RE, "").replace(/[|,–—-]+\s*$/, "").trim();
      const prev = header || lines[i - 1] || "";
      const [title, company] = prev.split(/\s+(?:at|@|\||,|–|—|-)\s+/);
      current = {
        title: (title ?? "").trim(),
        company: (company ?? "").trim(),
        start: range[1],
        end: range[2],
        bullets: [],
      };
      experience.push(current);
    } else if (current && /^[•\-*▪●◦]/.test(line)) {
      current.bullets.push(line.replace(/^[•\-*▪●◦]\s*/, ""));
    } else if (current && current.bullets.length > 0 && line.length > 30) {
      current.bullets.push(line);
    }
  }

  const education: string[] = [];
  section = "";
  for (const line of lines) {
    const sec = line.match(SECTION_RE);
    if (sec && line.length < 40) {
      section = sec[1].toLowerCase();
      continue;
    }
    if (section === "education" && education.length < 4) education.push(line);
  }

  const headline = lines.find((l, i) => i > 0 && i < 6 && l !== name && l.length < 80 && !EMAIL_RE.test(l) && !PHONE_RE.test(l)) ?? "";

  return {
    name,
    email,
    phone,
    linkedin,
    github,
    headline,
    yearsExperience,
    skills: extractSkills(text),
    experience,
    education,
    resumeText: text,
  };
}
