import type { LearnResource } from "./resources";
import { mergeResources } from "./resources";

export type GapCount = { skill: string; jobs: number };

export type RoadmapDraftItem = {
  phase: number;
  phaseTitle: string;
  title: string;
  detail: string;
};

export type LearningDraftItem = {
  skill: string;
  title: string;
  notes: string;
  resources: LearnResource[];
};

/**
 * Offline fallback: build a short plan from real skill gaps only.
 * Each item includes real videos / docs / practice sites.
 */
export function buildRoadmap(goal: string, gaps: GapCount[], weeksPerPhase = 2): RoadmapDraftItem[] {
  const top = gaps.slice(0, 5);
  const items: RoadmapDraftItem[] = [];
  const w = (n: number) => `Weeks ${(n - 1) * weeksPerPhase + 1}-${n * weeksPerPhase}`;

  const p1 = `Close the gaps · ${w(1)}`;
  if (top.length === 0) {
    items.push({
      phase: 1,
      phaseTitle: p1,
      title: "Search for your target roles first",
      detail: "Run a search so the app can see which skills keep showing up in roles you want.",
    });
  }
  for (const g of top.slice(0, 3)) {
    const topLink = mergeResources(g.skill)[0];
    items.push({
      phase: 1,
      phaseTitle: p1,
      title: `Learn ${g.skill}`,
      detail: `${g.jobs} of the jobs you fetched ask for it.${topLink ? ` Start here: ${topLink.url}` : ""}`,
    });
  }

  const p2 = `Prove it · ${w(2)}`;
  for (const g of top.slice(0, 2)) {
    items.push({
      phase: 2,
      phaseTitle: p2,
      title: `Small project: ${g.skill}`,
      detail: `Build one small thing that uses ${g.skill} and put it on GitHub so you can talk about it in interviews.`,
    });
  }
  if (top.length) {
    items.push({
      phase: 2,
      phaseTitle: p2,
      title: "Update your resume",
      detail: "Add what you built in this phase. Only add it once it works.",
    });
  }

  const p3 = `Apply · ${w(3)}`;
  items.push({
    phase: 3,
    phaseTitle: p3,
    title: "Approve and submit matching drafts",
    detail: "Work through the inbox for roles that match your target titles.",
  });

  const p4 = `Interview · ${w(4)}`;
  items.push(
    {
      phase: 4,
      phaseTitle: p4,
      title: "Practice mock interviews for your target role",
      detail: "Generate questions for the role you want and redo weak answers.",
    },
    {
      phase: 4,
      phaseTitle: p4,
      title: goal ? `Reach: ${goal}` : "Keep applying to matching roles",
      detail: goal
        ? "Compare offers on role, team and pay, not just the number."
        : "Stay focused on the titles you set on your resume.",
    },
  );

  return items;
}

/** Offline learning list from gaps — always includes concrete learn/practice URLs. */
export function buildLearningFromGaps(gaps: GapCount[], targetTitles: string[]): LearningDraftItem[] {
  const role = targetTitles[0] ?? "your target role";
  return gaps.slice(0, 8).map((g) => ({
    skill: g.skill,
    title: `Learn ${g.skill} for ${role}`,
    notes: `${g.jobs} fetched job${g.jobs === 1 ? "" : "s"} ask for this and it is not strong on your resume yet.`,
    resources: mergeResources(g.skill),
  }));
}
