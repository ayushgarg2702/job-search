export type GapCount = { skill: string; jobs: number };

export type RoadmapDraftItem = {
  phase: number;
  phaseTitle: string;
  title: string;
  detail: string;
};

const PROJECT_HINTS: Record<string, string> = {
  "System design": "Write up the design of one system you built: load, data model, what broke, what you would change.",
  Kubernetes: "Deploy one of your services on a local kind/minikube cluster with a health check and rolling update.",
  Docker: "Containerise a side project and push the image; document the run command in the README.",
  AWS: "Host a small API on AWS free tier (Lambda or EC2 + RDS) and note the monthly cost.",
  "Data structures & algorithms": "Do 3 medium problems a day on arrays, trees and graphs for two weeks. Track which ones you got stuck on.",
  React: "Ship a small React app with routing, a form and an API call. Put it on GitHub with screenshots.",
  TypeScript: "Convert one JS project to strict TypeScript and fix every error without `any`.",
  SQL: "Solve 20 SQL questions on joins, window functions and group by. Save the ones you missed.",
  Kafka: "Build a producer/consumer pair locally and handle a consumer crash without losing messages.",
  "LLMs / GenAI": "Build a small RAG tool over your own notes and measure where it answers wrong.",
};

/**
 * Turns a goal and the skills you keep missing into a four-phase plan.
 * The plan is a starting point; every item is editable in the UI.
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
      title: "Fetch jobs first",
      detail: "Run a search so the app can see which skills keep showing up in roles you want.",
    });
  }
  for (const g of top.slice(0, 3)) {
    items.push({
      phase: 1,
      phaseTitle: p1,
      title: `Learn ${g.skill}`,
      detail: `${g.jobs} of the jobs you fetched ask for it. Aim for 5 hours this phase.`,
    });
  }

  const p2 = `Prove it · ${w(2)}`;
  for (const g of top.slice(0, 2)) {
    items.push({
      phase: 2,
      phaseTitle: p2,
      title: `Small project: ${g.skill}`,
      detail: PROJECT_HINTS[g.skill] ?? `Build one small thing that uses ${g.skill} and put it on GitHub.`,
    });
  }
  items.push({
    phase: 2,
    phaseTitle: p2,
    title: "Update your resume",
    detail: "Add what you built in this phase. Only add it once it works.",
  });

  const p3 = `Apply · ${w(3)}`;
  items.push(
    {
      phase: 3,
      phaseTitle: p3,
      title: "Hit your weekly application target",
      detail: "Approve drafts from the inbox every day instead of in one big batch.",
    },
    {
      phase: 3,
      phaseTitle: p3,
      title: "Message one person per application",
      detail: "A short note to someone on the team. Referrals move faster than the portal.",
    },
  );

  const p4 = `Interview · ${w(4)}`;
  items.push(
    {
      phase: 4,
      phaseTitle: p4,
      title: "Two mock interviews a week",
      detail: "Use the dummy interview page. Redo any answer that scored low.",
    },
    {
      phase: 4,
      phaseTitle: p4,
      title: "Prepare CTC and notice period answers",
      detail: "Know your current CTC, expected CTC and earliest joining date before the HR round.",
    },
    {
      phase: 4,
      phaseTitle: p4,
      title: `Reach the goal: ${goal}`,
      detail: "Compare offers on role, team and pay, not just the number.",
    },
  );

  return items;
}
