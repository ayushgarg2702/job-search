import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { ProgressLine } from "@/components/progress-line";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { mainGoal } from "@/lib/goals";
import { getProfile } from "@/lib/store";
import { BuildRoadmapButton, RoadmapPhase } from "./roadmap-ui";

export type RoadmapRow = { id: number; phase: number; phase_title: string; title: string; detail: string; done: number };

export default function RoadmapPage() {
  const goal = mainGoal();
  const profile = getProfile();
  const rows = db().prepare("SELECT * FROM roadmap_items ORDER BY phase, position, id").all() as RoadmapRow[];
  const phases = [...new Set(rows.map((r) => r.phase))];
  const done = rows.filter((r) => r.done).length;
  const canBuild = Boolean(goal || profile.targetTitles.length);

  return (
    <>
      <PageHeader
        title="Roadmap"
        lead={
          goal
            ? `A plan from where you are to: ${goal.title}`
            : profile.targetTitles[0]
              ? `A plan toward ${profile.targetTitles[0]} roles, built from your skill gaps.`
              : "A step-by-step plan built from your target titles and the skills jobs keep asking for."
        }
      >
        {canBuild && <BuildRoadmapButton hasItems={rows.length > 0} />}
      </PageHeader>

      {!canBuild ? (
        <EmptyState
          title="Add a target title first"
          action={
            <Link href="/profile" className={buttonVariants()}>
              Open resume
            </Link>
          }
        >
          Set the job titles you want (e.g. Sr. SDE). The roadmap is built around those and your job gaps.
        </EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState title="No roadmap yet">Press Build my roadmap. It uses your target role and skill gaps from real jobs.</EmptyState>
      ) : (
        <>
          <div className="mb-10 max-w-md animate-rise">
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                {done} of {rows.length} steps done
              </span>
              <span className="font-mono">{Math.round((done / rows.length) * 100)}%</span>
            </div>
            <ProgressLine value={done} max={rows.length} className="mt-2" />
          </div>
          <ol className="relative space-y-12 border-l-2 border-ink/15 pl-8">
            {phases.map((p) => (
              <RoadmapPhase key={p} phase={p} items={rows.filter((r) => r.phase === p)} />
            ))}
          </ol>
        </>
      )}
    </>
  );
}
