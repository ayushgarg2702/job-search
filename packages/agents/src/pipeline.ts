import type { DraftPack, Profile } from "@career-os/shared";
import { DraftPackSchema } from "@career-os/shared";
import { cursorReady, extractJson, runCursor } from "./cursor";
import { checkProvenance, stripIssues, type ProvenanceIssue } from "./provenance";
import { standardAnswers, templateDraft, type JobForDraft } from "./template";
import { lintVoice, VOICE_RULES, type VoiceHit } from "./voice";

export type DraftStep = { name: string; ok: boolean; note: string };

export type DraftResult = {
  pack: DraftPack;
  source: "cursor" | "template";
  steps: DraftStep[];
  voiceHits: VoiceHit[];
  provenance: ProvenanceIssue[];
};

type AgentPack = { resumeMarkdown: string; coverLetter: string; whyThisRole: string };

function profileFacts(profile: Profile): string {
  return JSON.stringify(
    {
      name: profile.name,
      city: profile.city,
      yearsExperience: profile.yearsExperience,
      headline: profile.headline,
      summary: profile.summary,
      skills: profile.skills,
      experience: profile.experience,
      education: profile.education,
      noticePeriodDays: profile.noticePeriodDays,
      contact: [profile.phone, profile.email, profile.linkedin, profile.github].filter(Boolean),
    },
    null,
    2,
  );
}

const OUTPUT_SHAPE = `Reply with only a JSON object, no prose before or after:
{"resumeMarkdown": "...", "coverLetter": "...", "whyThisRole": "..."}`;

function drafterPrompt(profile: Profile, job: JobForDraft, base: DraftPack): string {
  return `You are tailoring one job application. Do not use any tools. Do not create or edit files. Only reply with text.

FACTS ABOUT THE CANDIDATE (the only source of truth):
${profileFacts(profile)}

FULL RESUME TEXT:
${profile.resumeText.slice(0, 8000)}

JOB:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description:
${job.description.slice(0, 6000)}

STARTING DRAFT (built from the resume, reorder and reword it, do not add facts):
${base.resumeMarkdown}

Tasks:
1. resumeMarkdown: the resume in Markdown, tailored to this job. Reorder skills and bullets so the most relevant come first. Reword bullets to be clearer. Keep every employer, title, date and number exactly as in the facts. Do not add skills, tools, numbers or projects that are not in the facts.
2. coverLetter: 120-200 words. Open with the role. Two or three specific things from the candidate's real experience that match the job. If the job needs something the candidate lacks, say so in one honest line. Mention notice period if known. Sign off with the name.
3. whyThisRole: 2-3 sentences for the "why do you want to join" form field. Specific to this role, no flattery.

Voice rules:
${VOICE_RULES}

${OUTPUT_SHAPE}`;
}

function criticPrompt(draft: AgentPack, profile: Profile, problems: string): string {
  return `You are a strict editor reviewing a job application before the candidate sees it. Do not use any tools. Only reply with text.

Fix these problems and anything else that sounds generated or salesy:
${problems || "- Cut filler, stacked adjectives and anything that sounds like a template."}

Hard rules:
- Every number, employer, skill and project must appear in the facts below. Remove any that do not.
- Keep it short and plain. A hiring manager in India should think the candidate wrote it in one sitting.
${VOICE_RULES}

FACTS:
${profileFacts(profile)}

DRAFT:
${JSON.stringify(draft, null, 2)}

${OUTPUT_SHAPE}`;
}

function problemsList(text: string, profile: Profile, jobText: string) {
  const voiceHits = lintVoice(text);
  const provenance = checkProvenance(text, profile, jobText);
  const lines = [
    ...[...new Set(voiceHits.map((h) => h.phrase))].map((p) => `- Remove "${p}".`),
    ...provenance.map((p) => `- "${p.value}" is not in the candidate's facts (${p.context}). Remove it.`),
  ];
  return { voiceHits, provenance, text: lines.join("\n") };
}

function toPack(agent: AgentPack, profile: Profile, job: JobForDraft): DraftPack {
  return DraftPackSchema.parse({
    resumeMarkdown: agent.resumeMarkdown,
    coverLetter: agent.coverLetter,
    answers: [
      ...standardAnswers(profile, job),
      { question: `Why do you want to join ${job.company}?`, answer: agent.whyThisRole },
    ],
  });
}

function packText(pack: DraftPack) {
  return `${pack.resumeMarkdown}\n${pack.coverLetter}\n${pack.answers.map((a) => a.answer).join("\n")}`;
}

/**
 * Drafter -> critic/voice -> provenance check -> one repair pass.
 * Falls back to the offline template if the Cursor CLI is missing or fails.
 */
export async function runDraftPipeline(
  profile: Profile,
  job: JobForDraft,
  opts: { model?: string } = {},
): Promise<DraftResult> {
  const base = templateDraft(profile, job);
  const steps: DraftStep[] = [];
  const jobText = `${job.title}\n${job.description}`;

  const cursor = cursorReady();
  if (!cursor.installed || cursor.loggedIn === false) {
    const check = problemsList(packText(base), profile, jobText);
    steps.push({
      name: "Offline draft",
      ok: true,
      note: cursor.installed
        ? "Cursor CLI is not signed in (run `agent login`). Built from your resume only."
        : "Cursor CLI not found. Built from your resume only.",
    });
    return { pack: base, source: "template", steps, voiceHits: check.voiceHits, provenance: check.provenance };
  }

  try {
    const draftRaw = await runCursor(drafterPrompt(profile, job, base), opts);
    let draft = extractJson<AgentPack>(draftRaw);
    steps.push({ name: "Drafter", ok: true, note: "Tailored resume, cover letter and answer." });

    let check = problemsList(JSON.stringify(draft), profile, jobText);
    const criticRaw = await runCursor(criticPrompt(draft, profile, check.text), opts);
    draft = extractJson<AgentPack>(criticRaw);
    steps.push({ name: "Critic + voice", ok: true, note: "Cut filler and anything not backed by your resume." });

    check = problemsList(JSON.stringify(draft), profile, jobText);
    if (check.voiceHits.length || check.provenance.length) {
      const repairRaw = await runCursor(criticPrompt(draft, profile, check.text), opts);
      draft = extractJson<AgentPack>(repairRaw);
      steps.push({ name: "Repair pass", ok: true, note: `Fixed ${check.voiceHits.length + check.provenance.length} flagged items.` });
    }

    let pack = toPack(draft, profile, job);
    check = problemsList(packText(pack), profile, jobText);
    if (check.provenance.length) {
      pack = {
        ...pack,
        coverLetter: stripIssues(pack.coverLetter, check.provenance),
        resumeMarkdown: stripIssues(pack.resumeMarkdown, check.provenance),
      };
      check = problemsList(packText(pack), profile, jobText);
    }
    steps.push({
      name: "Provenance check",
      ok: check.provenance.length === 0,
      note: check.provenance.length ? `${check.provenance.length} claims still need your eye.` : "Every claim traces back to your resume.",
    });
    return { pack, source: "cursor", steps, voiceHits: check.voiceHits, provenance: check.provenance };
  } catch (err) {
    const check = problemsList(packText(base), profile, jobText);
    steps.push({ name: "Cursor agent", ok: false, note: `Failed (${(err as Error).message.slice(0, 160)}). Used the offline draft.` });
    return { pack: base, source: "template", steps, voiceHits: check.voiceHits, provenance: check.provenance };
  }
}
