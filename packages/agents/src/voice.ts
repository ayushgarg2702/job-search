/**
 * Phrases that make a resume or cover letter read like a template. The voice
 * check fails a draft that contains any of them.
 */
export const BANNED_PHRASES: string[] = [
  "delve",
  "leverage",
  "leveraging",
  "leveraged",
  "synergy",
  "synergies",
  "passionate",
  "passion for",
  "excited to",
  "thrilled",
  "robust",
  "utilize",
  "utilise",
  "utilizing",
  "furthermore",
  "moreover",
  "in today's fast-paced",
  "fast-paced environment",
  "dynamic environment",
  "results-driven",
  "detail-oriented",
  "self-starter",
  "go-getter",
  "team player",
  "cutting-edge",
  "state-of-the-art",
  "game-changer",
  "spearheaded",
  "seamless",
  "seamlessly",
  "holistic",
  "tapestry",
  "testament to",
  "i am writing to express",
  "i am confident that",
  "i believe i would be a great fit",
  "esteemed organization",
  "esteemed company",
  "i hope this finds you well",
  "look no further",
  "proven track record",
  "best-in-class",
  "world-class",
  "unlock",
  "empower",
  "elevate",
  "navigate the complexities",
  "ever-evolving",
  "landscape",
  "realm",
];

export type VoiceHit = { phrase: string; index: number };

export function lintVoice(text: string): VoiceHit[] {
  const lower = text.toLowerCase();
  const hits: VoiceHit[] = [];
  for (const phrase of BANNED_PHRASES) {
    const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    for (const m of lower.matchAll(re)) hits.push({ phrase, index: m.index ?? 0 });
  }
  if (/[\u{1F300}-\u{1FAFF}]/u.test(text)) hits.push({ phrase: "emoji", index: 0 });
  if ((text.match(/—/g) ?? []).length > 3) hits.push({ phrase: "too many em dashes", index: 0 });
  return hits;
}

export const VOICE_RULES = `Write like a working engineer in India writing their own application, not like a marketer.
- Short sentences. Plain words. Concrete verbs: built, fixed, shipped, cut, moved, wrote, ran.
- Say what was done, for whom, and what changed. One fact per sentence.
- No adjectives about yourself (hard-working, passionate, dedicated, detail-oriented).
- No praise of the company. Mention one specific thing about the role or product instead.
- No filler openers or closers ("I am writing to express", "I look forward to hearing from you at your earliest convenience").
- Never use these words or phrases: ${BANNED_PHRASES.join(", ")}.
- No emoji. At most one em dash in the whole text.
- Indian English is fine (CTC, notice period, LPA). Do not use American-only references.`;
