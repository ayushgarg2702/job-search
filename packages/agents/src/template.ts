import { extractSkills, hasSkill } from "@career-os/engine";
import type { Answer, DraftPack, Profile } from "@career-os/shared";
import { formatLpa, normalizeCity } from "@career-os/shared";

export type JobForDraft = {
  title: string;
  company: string;
  location: string;
  description: string;
};

function relevance(bullet: string, jdSkills: string[]): number {
  const skills = extractSkills(bullet);
  const overlap = skills.filter((s) => jdSkills.includes(s)).length;
  return overlap * 10 + (/\d/.test(bullet) ? 3 : 0) + Math.min(bullet.length, 200) / 100;
}

export function tailoredResumeMarkdown(profile: Profile, job: JobForDraft): string {
  const jdSkills = extractSkills(`${job.title}\n${job.description}`);
  const skills = [...profile.skills].sort(
    (a, b) => Number(jdSkills.includes(b)) - Number(jdSkills.includes(a)),
  );
  const contact = [profile.phone, profile.email, profile.city, profile.linkedin, profile.github]
    .filter(Boolean)
    .join(" · ");

  const lines: string[] = [`# ${profile.name || "Your Name"}`, contact, ""];
  const summary = profile.summary || profile.headline;
  if (summary) lines.push("## Summary", summary, "");
  if (skills.length) lines.push("## Skills", skills.join(", "), "");

  if (profile.experience.length) {
    lines.push("## Experience");
    for (const exp of profile.experience) {
      lines.push(`### ${[exp.title, exp.company].filter(Boolean).join(", ")}`);
      if (exp.start || exp.end) lines.push(`${exp.start} – ${exp.end}`);
      const bullets = [...exp.bullets].sort((a, b) => relevance(b, jdSkills) - relevance(a, jdSkills));
      for (const b of bullets) lines.push(`- ${b}`);
      lines.push("");
    }
  } else if (profile.resumeText) {
    lines.push("## Experience", profile.resumeText.slice(0, 3000), "");
  }

  if (profile.education.length) {
    lines.push("## Education", ...profile.education.map((e) => `- ${e}`), "");
  }
  return lines.join("\n").trim();
}

export function standardAnswers(profile: Profile, job: JobForDraft): Answer[] {
  const answers: Answer[] = [];
  if (profile.currentCtcInr)
    answers.push({ question: "Current CTC", answer: `${formatLpa(profile.currentCtcInr)} (${profile.currentCtcInr} INR per year)` });
  if (profile.expectedCtcInr)
    answers.push({ question: "Expected CTC", answer: `${formatLpa(profile.expectedCtcInr)} (${profile.expectedCtcInr} INR per year)` });
  if (profile.noticePeriodDays !== null)
    answers.push({
      question: "Notice period",
      answer: profile.noticePeriodDays === 0 ? "Can join immediately." : `${profile.noticePeriodDays} days.`,
    });
  answers.push({ question: "Total experience", answer: `${profile.yearsExperience} years` });
  answers.push({ question: "Current location", answer: profile.city || "—" });
  const jobCity = normalizeCity(job.location);
  answers.push({
    question: "Willing to relocate?",
    answer:
      jobCity === profile.city || jobCity === "Remote (India)"
        ? "Not needed, I am already set up for this location."
        : profile.preferredCities.includes(jobCity)
          ? `Yes, ${jobCity} works for me.`
          : "Open to discussing it.",
  });
  return answers;
}

/**
 * Offline draft built only from your resume. Used when the Cursor agent is not
 * set up, and as the starting point the agent rewrites.
 */
export function templateDraft(profile: Profile, job: JobForDraft): DraftPack {
  const jdSkills = extractSkills(`${job.title}\n${job.description}`);
  const matched = jdSkills.filter((s) => hasSkill(profile.skills, s)).slice(0, 4);
  const missing = jdSkills.filter((s) => !hasSkill(profile.skills, s)).slice(0, 2);
  const latest = profile.experience[0];
  const bullets = profile.experience
    .flatMap((e) => e.bullets)
    .sort((a, b) => relevance(b, jdSkills) - relevance(a, jdSkills))
    .slice(0, 2);

  const parts: string[] = [`Hi ${job.company} team,`, ""];
  const where = job.location ? ` in ${normalizeCity(job.location)}` : "";
  parts.push(`I'd like to apply for the ${job.title} role${where}.`);
  if (latest?.title) {
    parts.push(
      `I have ${profile.yearsExperience} years of experience. Right now I work as ${latest.title}${latest.company ? ` at ${latest.company}` : ""}.`,
    );
  } else if (profile.yearsExperience) {
    parts.push(`I have ${profile.yearsExperience} years of experience.`);
  }
  parts.push("");
  if (matched.length) parts.push(`The posting asks for ${matched.join(", ")}. That is what I work with day to day.`);
  if (bullets.length) {
    parts.push("A couple of things I've done:");
    for (const b of bullets) parts.push(`- ${b.replace(/\.$/, "")}.`);
  }
  if (missing.length) {
    parts.push("", `I haven't used ${missing.join(" or ")} at work yet. I'm picking it up now and can talk about where I am with it.`);
  }
  parts.push("");
  if (profile.noticePeriodDays !== null) {
    parts.push(
      profile.noticePeriodDays === 0
        ? "I can join immediately."
        : `My notice period is ${profile.noticePeriodDays} days.`,
    );
  }
  parts.push("Happy to share more on a call.", "", "Thanks,", profile.name || "", [profile.phone, profile.email].filter(Boolean).join(" · "));

  return {
    resumeMarkdown: tailoredResumeMarkdown(profile, job),
    coverLetter: parts.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
    answers: [
      ...standardAnswers(profile, job),
      {
        question: `Why do you want to join ${job.company}?`,
        answer: matched.length
          ? `The role is close to what I already do with ${matched.slice(0, 2).join(" and ")}, and I want to keep building in that direction.`
          : "The work in this role is the direction I want to grow in.",
      },
    ],
  };
}
