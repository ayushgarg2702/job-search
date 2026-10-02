import { STATUS_LABEL } from "@career-os/shared";
import { ArrowRight, CheckCircle2, Circle, Flame } from "lucide-react";
import Link from "next/link";
import { ProgressLine } from "@/components/progress-line";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { mainGoal } from "@/lib/goals";
import { listJobs } from "@/lib/jobs";
import { activityStreak, targetProgress } from "@/lib/metrics";
import { getProfile } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function TodayPage() {
  const profile = getProfile();
  const goal = mainGoal();
  const waiting = listJobs(["awaiting_approval", "ready_to_submit"], 5);
  const targets = targetProgress();
  const streak = activityStreak();
  const searched = (db().prepare("SELECT COUNT(*) AS n FROM fetch_runs").get() as { n: number }).n > 0;
  const nextStep = db()
    .prepare("SELECT title, detail FROM roadmap_items WHERE done = 0 ORDER BY phase, position LIMIT 1")
    .get() as { title: string; detail: string } | undefined;

  const setup = [
    { done: profile.resumeText.length > 0, label: "Upload your resume", href: "/profile" },
    { done: goal !== null, label: "Write down your goal", href: "/goals" },
    { done: targets.length > 0, label: "Set a weekly target", href: "/goals" },
    { done: searched, label: "Run your first job search", href: "/connections" },
  ];
  const setupLeft = setup.filter((s) => !s.done).length;

  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = profile.name.split(" ")[0];

  return (
    <div className="space-y-10">
      <section className="animate-rise">
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="mt-2 text-4xl font-bold text-ink sm:text-5xl">
          {hello}
          {firstName ? `, ${firstName}` : ""}.
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          {goal ? (
            <>
              Working towards: <span className="font-medium text-foreground">{goal.title}</span>
            </>
          ) : (
            "Set a goal and the rest of the app lines up behind it."
          )}
        </p>
      </section>

      {setupLeft > 0 && (
        <section className="rounded-2xl border bg-card p-6 animate-rise">
          <h2 className="text-lg font-semibold text-ink">Get set up · {setup.length - setupLeft} of {setup.length} done</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {setup.map((s) => (
              <li key={s.label}>
                <Link
                  href={s.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted",
                    s.done && "text-muted-foreground",
                  )}
                >
                  {s.done ? <CheckCircle2 className="size-4 text-leaf" /> : <Circle className="size-4 text-ink/40" />}
                  <span className={cn(s.done && "line-through")}>{s.label}</span>
                  {!s.done && <ArrowRight className="ml-auto size-4" />}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <section className="animate-rise">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold text-ink">Waiting for you</h2>
            <Link href="/inbox" className="text-sm font-medium text-ink underline-offset-4 hover:underline">
              Open inbox
            </Link>
          </div>
          {waiting.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Nothing to approve right now. New drafts show up here after a search.
            </p>
          ) : (
            <ul className="stagger mt-4 divide-y rounded-xl border bg-card">
              {waiting.map((j) => (
                <li key={j.id}>
                  <Link
                    href={j.status === "ready_to_submit" ? `/apply/${j.id}` : `/inbox/${j.id}`}
                    className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/60"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary font-mono text-sm font-semibold text-ink">
                      {j.score ?? "–"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{j.title}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {j.company} · {j.city}
                      </span>
                    </span>
                    <span className="hidden text-xs font-medium text-accent-foreground sm:block">{STATUS_LABEL[j.status]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-6 animate-rise">
          <div className="flex items-center gap-4">
            <Flame className={cn("size-10", streak > 0 ? "text-marigold" : "text-muted-foreground/40")} />
            <div>
              <p className="font-display text-3xl font-bold text-ink">
                {streak} day{streak === 1 ? "" : "s"}
              </p>
              <p className="text-sm text-muted-foreground">
                {streak > 0 ? "in a row. Keep it going today." : "Do one thing today to start a streak."}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-ink">This week</h2>
            {targets.length === 0 ? (
              <Link href="/goals" className={buttonVariants({ variant: "outline" })}>
                Set a weekly target
              </Link>
            ) : (
              targets.map((t) => (
                <div key={t.id}>
                  <div className="flex justify-between text-sm">
                    <span>{t.label}</span>
                    <span className="font-mono tabular-nums">
                      {t.current}/{t.goalValue}
                    </span>
                  </div>
                  <ProgressLine value={t.current} max={t.goalValue} className="mt-1.5" />
                </div>
              ))
            )}
          </div>

          {nextStep && (
            <div className="border-t pt-5">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Next on your roadmap</p>
              <p className="mt-1 font-medium">{nextStep.title}</p>
              <p className="text-sm text-muted-foreground">{nextStep.detail}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
