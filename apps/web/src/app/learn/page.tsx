import { PageHeader } from "@/components/page-header";
import { listLearning, mockScoreTrend, recentPractice, skillGaps, studyByDay, studyTotals } from "@/lib/learning";
import { activityStreak } from "@/lib/metrics";
import { getProfile } from "@/lib/store";
import { GapList, GeneratePlanButton, LearningList, StudyLogForm } from "./learn-ui";
import { MockTrendChart, StudyChart } from "./learn-charts";

export default function LearnPage() {
  const gaps = skillGaps();
  const items = listLearning();
  const totals = studyTotals();
  const byDay = studyByDay();
  const trend = mockScoreTrend();
  const recent = recentPractice();
  const profile = getProfile();
  const onList = new Set(items.filter((i) => i.status !== "done").map((i) => i.skill.toLowerCase()));

  return (
    <>
      <PageHeader
        title="Learn"
        lead={
          profile.targetTitles.length
            ? `What ${profile.targetTitles[0]} roles keep asking for, and what you're working on.`
            : "What the jobs you want keep asking for, what you're working on, and how much you've put in."
        }
      >
        <GeneratePlanButton />
      </PageHeader>

      <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-ink">What you need to learn</h2>
          <p className="text-sm text-muted-foreground">
            Skills jobs ask for that aren&apos;t strong on your resume. Press Generate plan to get videos, docs, and practice sites for each.
          </p>
          <GapList gaps={gaps} onList={[...onList]} />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-ink">Your learning list</h2>
          <LearningList items={items} />
        </section>
      </div>

      <section className="mt-14 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-xl font-semibold text-ink">Self-training</h2>
            <p className="text-sm text-muted-foreground">Log every study session, even 15 minutes. It adds up.</p>
          </div>
          <div className="flex gap-10">
            <div>
              <p className="font-display text-3xl font-bold text-ink">{Math.round(totals.week / 6) / 10}h</p>
              <p className="text-xs text-muted-foreground">this week</p>
            </div>
            <div>
              <p className="font-display text-3xl font-bold text-ink">{Math.round(totals.total / 6) / 10}h</p>
              <p className="text-xs text-muted-foreground">all time · {totals.sessions} sessions</p>
            </div>
            <div>
              <p className="font-display text-3xl font-bold text-ink">{activityStreak()}</p>
              <p className="text-xs text-muted-foreground">day streak</p>
            </div>
          </div>
        </div>
        <StudyLogForm items={items.filter((i) => i.status !== "done").map((i) => ({ id: i.id, title: i.title }))} />
      </section>

      <section className="mt-14 grid gap-12 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-ink">Study time, last 4 weeks</h2>
          <StudyChart data={byDay} />
          {recent.length > 0 && (
            <ul className="divide-y text-sm">
              {recent.map((r) => (
                <li key={r.id} className="flex justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{r.item ?? "Study"}</span>
                    {r.note ? <span className="text-muted-foreground"> · {r.note}</span> : null}
                  </span>
                  <span className="shrink-0 font-mono text-muted-foreground">{r.minutes} min</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-ink">Mock interview scores</h2>
          <p className="text-sm text-muted-foreground">Average score per practice session. You want this line going up.</p>
          {trend.length ? (
            <MockTrendChart data={trend} />
          ) : (
            <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              Finish a dummy interview to start the trend.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
