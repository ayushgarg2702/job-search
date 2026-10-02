import { TARGET_METRICS } from "@career-os/shared";
import { PageHeader } from "@/components/page-header";
import { listGoals } from "@/lib/goals";
import { targetProgress } from "@/lib/metrics";
import { GoalForm, GoalList } from "./goal-ui";
import { TargetEditor } from "./target-ui";

export default function GoalsPage() {
  const goals = listGoals();
  const targets = targetProgress();
  return (
    <>
      <PageHeader title="Goals & targets" lead="Goals are where you want to end up. Targets are what you do each week to get there." />

      <div className="grid gap-12 lg:grid-cols-2">
        <section className="space-y-5">
          <h2 className="text-xl font-semibold text-ink">Goals</h2>
          <GoalForm />
          <GoalList goals={goals} />
        </section>

        <section className="space-y-5">
          <h2 className="text-xl font-semibold text-ink">Weekly targets</h2>
          <p className="text-sm text-muted-foreground">
            Progress counts what you actually did: submitted applications, logged study time, finished mock interviews.
          </p>
          <TargetEditor targets={targets} metrics={TARGET_METRICS.map((m) => ({ id: m.id, label: m.label, unit: m.unit }))} />
        </section>
      </div>
    </>
  );
}
