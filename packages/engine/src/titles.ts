/** Section headers and noise that must never become a target title or search term. */
const SECTION_NOISE =
  /^(professional\s+summary|summary|profile|objective|contact|experience|work experience|education|skills|technical skills|projects|certifications|achievements|about me|personal details)\b/i;

/**
 * Roles that look adjacent to "software engineer" but are usually wrong when
 * someone asks for Sr. SDE / Senior Software Engineer.
 */
const DIVERGENT_ROLE =
  /\b(sdet|sre|site reliability|qa\b|quality assurance|test engineer|tester|devops|support engineer|customer support|helpdesk|help desk|manual test|automation test|engineer in test|in test\b|implementation engineer|forward deployed|security engineer|data engineer|program manager|engineering manager|\bcto\b|\bai engineer\b)\b/i;

/** Expand common India title short forms so search boards find them. */
const TITLE_ALIASES: Record<string, string[]> = {
  sde: ["software development engineer", "software engineer", "SDE"],
  "sr sde": ["senior software engineer", "senior software development engineer", "Sr. SDE", "SDE-2", "SDE-3"],
  "sr. sde": ["senior software engineer", "senior software development engineer", "Sr. SDE", "SDE-2", "SDE-3"],
  "senior sde": ["senior software engineer", "senior software development engineer", "Sr. SDE"],
  "sde-2": ["SDE-2", "software development engineer 2", "senior software engineer"],
  "sde-3": ["SDE-3", "software development engineer 3", "staff software engineer", "senior software engineer"],
  "sde 2": ["SDE-2", "software development engineer 2", "senior software engineer"],
  "sde 3": ["SDE-3", "software development engineer 3", "staff software engineer"],
};

export function isNoiseTitle(title: string): boolean {
  const t = title.trim();
  if (!t || t.length < 2) return true;
  if (SECTION_NOISE.test(t)) return true;
  if (t.length < 40 && /^(summary|profile|objective)\b/i.test(t)) return true;
  return false;
}

export function cleanTargetTitles(titles: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of titles) {
    const t = raw.trim().replace(/\s+/g, " ");
    if (isNoiseTitle(t)) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/** Search phrases sent to JobSpy / Instahyre / ATS filters. */
export function searchTermsFromTitles(titles: string[]): string[] {
  const cleaned = cleanTargetTitles(titles);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of cleaned) {
    const key = t.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
    const aliases = TITLE_ALIASES[key] ?? [t];
    for (const a of aliases) {
      const k = a.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(a);
    }
  }
  return out.slice(0, 8);
}

function userAskedForDivergent(targets: string[]): boolean {
  return targets.some((t) => DIVERGENT_ROLE.test(t));
}

function tokenize(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/\./g, "")
    .split(/[^a-z0-9+#]+/)
    .filter((w) => w.length > 0);
}

/** Word-boundary-ish match so "sde" does not hit "sdet". */
function hasToken(tokens: Set<string>, word: string): boolean {
  if (tokens.has(word)) return true;
  // Allow SDE-2 style compounds already split
  return false;
}

/**
 * Drop jobs whose titles are clearly a different track (SDET, SRE, QA…)
 * unless the user explicitly targeted those words.
 */
export function titleMatchesTargets(jobTitle: string, targets: string[]): boolean {
  const cleaned = cleanTargetTitles(targets);
  if (cleaned.length === 0) return false;
  if (!userAskedForDivergent(cleaned) && DIVERGENT_ROLE.test(jobTitle)) return false;

  const jobTokens = new Set(tokenize(jobTitle));

  for (const t of cleaned) {
    const words = tokenize(t).filter((w) => w.length > 1);
    if (words.length === 0) continue;
    const soft = new Set(["sr", "senior", "jr", "junior", "ii", "iii", "2", "3"]);
    const hard = words.filter((w) => !soft.has(w));
    const check = hard.length ? hard : words;
    const hit = check.filter((w) => hasToken(jobTokens, w)).length;
    if (hit >= Math.ceil(check.length * 0.6)) return true;
  }

  // Alias expansion: "Sr. SDE" should match "Senior Software Engineer"
  for (const term of searchTermsFromTitles(cleaned)) {
    const parts = tokenize(term).filter((w) => w.length > 2 && !["and", "the", "for"].includes(w));
    if (parts.length === 0) continue;
    const hit = parts.filter((w) => hasToken(jobTokens, w)).length;
    if (hit >= Math.ceil(parts.length * 0.7)) return true;
  }

  return false;
}

/** 0–1 overlap used by scoring. Stricter than the old word-ratio when targets exist. */
export function titleOverlapScore(jobTitle: string, targets: string[]): number {
  const cleaned = cleanTargetTitles(targets);
  if (cleaned.length === 0) return 0.2;
  if (!titleMatchesTargets(jobTitle, cleaned)) return 0.05;

  const jobTokens = new Set(tokenize(jobTitle));
  let best = 0;
  for (const t of cleaned) {
    const words = tokenize(t).filter((w) => w.length > 1);
    if (!words.length) continue;
    const hit = words.filter((w) => hasToken(jobTokens, w)).length / words.length;
    best = Math.max(best, hit);
  }
  // Floor for alias matches that passed titleMatchesTargets
  return Math.max(best, 0.65);
}
