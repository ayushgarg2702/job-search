import type { FieldInfo, SessionRequest } from "./types";

const lpa = (inr: number | null) => (inr ? String(Math.round((inr / 100000) * 10) / 10) : "");

function words(s: string) {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !["your", "you", "the", "and", "are", "what", "please", "for", "with"].includes(w)),
  );
}

function overlap(a: string, b: string) {
  const wa = words(a);
  const wb = words(b);
  if (!wa.size || !wb.size) return 0;
  let hit = 0;
  for (const w of wa) if (wb.has(w)) hit++;
  return hit / Math.min(wa.size, wb.size);
}

export type Decision =
  | { kind: "fill"; value: string }
  | { kind: "file"; which: "resume" }
  | { kind: "skip"; reason: string };

/**
 * Decides what goes in one field. Rules first (contact details, CTC, notice
 * period), then the closest draft answer. Unknown fields are left for you.
 */
export function decide(field: FieldInfo, req: SessionRequest): Decision {
  const l = field.label.toLowerCase();
  const p = req.profile;
  const [first, ...rest] = p.name.split(" ");
  const last = rest.join(" ");

  if (field.type === "file") {
    if (/cover/.test(l)) return { kind: "skip", reason: "Cover letter upload. Paste the cover letter text instead, or attach it yourself." };
    if (/resume|cv|curriculum|attach|upload/.test(l) || l === "") return { kind: "file", which: "resume" };
    return { kind: "skip", reason: "File upload that isn't the resume. Attach it yourself." };
  }
  if (["checkbox", "radio"].includes(field.type)) {
    return { kind: "skip", reason: "Tick boxes and consent questions are left for you." };
  }
  if (/captcha|password|otp/.test(l)) return { kind: "skip", reason: "Left for you." };

  const rules: [RegExp, string][] = [
    [/first name|given name|^first$/, first],
    [/last name|surname|family name|^last$/, last],
    [/full name|^name\b|your name|candidate name/, p.name],
    [/e-?mail/, p.email],
    [/phone|mobile|contact number|whatsapp/, p.phone],
    [/linkedin/, p.linkedin],
    [/github/, p.github],
    [/portfolio|website|personal site|blog/, p.portfolio || p.github],
    [/current (location|city)|where are you (based|located)|^location$|^city$|city of residence/, p.city],
    [/current (company|employer|organi[sz]ation)|^company$|present employer/, p.currentCompany],
    [/current (title|role|designation|position)|^designation$|job title/, p.currentTitle],
    [/(total|years of|relevant) (work )?experience|experience \(years\)|how many years/, String(p.yearsExperience)],
    [/(current|present).{0,20}(ctc|salary|compensation|package)/, lpa(p.currentCtcInr) && `${lpa(p.currentCtcInr)} LPA`],
    [/(expected|desired).{0,20}(ctc|salary|compensation|package)|salary expectation/, lpa(p.expectedCtcInr) && `${lpa(p.expectedCtcInr)} LPA`],
    [/notice period|earliest (start|joining)|when can you (start|join)|how soon|availability to join|joining date|start date/,
      p.noticePeriodDays === null ? "" : p.noticePeriodDays === 0 ? "Immediately" : `${p.noticePeriodDays} days`],
    [/cover letter|additional information|anything else|message to (the )?hiring/, req.coverLetter],
  ];

  for (const [re, value] of rules) {
    if (re.test(l)) {
      if (!value) return { kind: "skip", reason: "Not in your profile yet." };
      if (field.tag === "select") return matchOption(field, value);
      return { kind: "fill", value };
    }
  }

  let best: { score: number; answer: string } | null = null;
  for (const a of req.answers) {
    const s = overlap(field.label, a.question);
    if (!best || s > best.score) best = { score: s, answer: a.answer };
  }
  if (best && best.score >= 0.5) {
    if (field.tag === "select") return matchOption(field, best.answer);
    return { kind: "fill", value: best.answer };
  }
  return { kind: "skip", reason: field.required ? "Required, and your draft has no answer for it." : "No answer in your draft." };
}

function matchOption(field: FieldInfo, value: string): Decision {
  const v = value.toLowerCase();
  const opt =
    field.options.find((o) => o.toLowerCase() === v) ??
    field.options.find((o) => o.toLowerCase().includes(v) || (o.length > 2 && v.includes(o.toLowerCase())));
  return opt ? { kind: "fill", value: opt } : { kind: "skip", reason: `No option matches "${value.slice(0, 40)}".` };
}

/** Lever and Ashby put the form on a separate page from the posting. */
export function applicationUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === "jobs.lever.co" && !u.pathname.endsWith("/apply")) u.pathname = `${u.pathname.replace(/\/$/, "")}/apply`;
    if (u.hostname === "jobs.ashbyhq.com" && !u.pathname.endsWith("/application")) u.pathname = `${u.pathname.replace(/\/$/, "")}/application`;
    return u.toString();
  } catch {
    return url;
  }
}
