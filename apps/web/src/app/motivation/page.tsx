import { db } from "@/lib/db";
import { mainGoal } from "@/lib/goals";
import { activityStreak } from "@/lib/metrics";
import { CheckInButton, WinForm } from "./motivation-ui";

type Entry = { id: number; kind: string; text: string; at: string };

function last28(checkins: Set<string>) {
  const days: { key: string; label: string; on: boolean; today: boolean }[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({ key, label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), on: checkins.has(key), today: i === 0 });
  }
  return days;
}

export default function MotivationPage() {
  const goal = mainGoal();
  const streak = activityStreak();
  const checkins = new Set(
    (
      db()
        .prepare("SELECT DISTINCT date(at, 'localtime') AS d FROM motivation_entries WHERE kind = 'checkin' AND date(at, 'localtime') >= date('now', 'localtime', '-27 days')")
        .all() as { d: string }[]
    ).map((r) => r.d),
  );
  const checkedToday = checkins.has(last28(checkins).at(-1)!.key);
  const wins = db().prepare("SELECT * FROM motivation_entries WHERE kind = 'win' ORDER BY id DESC LIMIT 20").all() as Entry[];
  const stats = db()
    .prepare(`
      SELECT
        (SELECT COUNT(DISTINCT job_id) FROM job_events WHERE status = 'submitted') AS sent,
        (SELECT COUNT(DISTINCT job_id) FROM job_events WHERE status = 'interviewing') AS interviews,
        (SELECT COALESCE(SUM(minutes), 0) FROM practice_logs WHERE kind = 'study') AS minutes,
        (SELECT COUNT(*) FROM interview_sessions WHERE finished_at IS NOT NULL) AS mocks`)
    .get() as { sent: number; interviews: number; minutes: number; mocks: number };

  const proof = [
    stats.sent && `You've sent ${stats.sent} application${stats.sent === 1 ? "" : "s"}.`,
    stats.interviews && `${stats.interviews} of them turned into interviews.`,
    stats.minutes && `You've put in ${Math.round(stats.minutes / 60)} hour${Math.round(stats.minutes / 60) === 1 ? "" : "s"} of study.`,
    stats.mocks && `You've done ${stats.mocks} mock interview${stats.mocks === 1 ? "" : "s"}.`,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden rounded-3xl bg-ink px-6 py-14 text-primary-foreground sm:px-12 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(600px 300px at 80% 0%, oklch(0.78 0.15 70 / 0.35), transparent 60%), radial-gradient(500px 300px at 0% 100%, oklch(0.62 0.13 155 / 0.3), transparent 60%)",
          }}
        />
        <div className="relative max-w-3xl">
          <p className="text-sm font-semibold tracking-[0.2em] text-marigold uppercase animate-rise">Motivation</p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] font-extrabold sm:text-7xl animate-rise">I can do it.</h1>
          <p className="mt-6 max-w-xl text-lg text-primary-foreground/80 animate-rise">
            {goal?.why
              ? `Your words: “${goal.why}”`
              : goal
                ? `You're working towards ${goal.title}. One step today is enough.`
                : "Hold the button, say it once, then go do one small thing."}
          </p>
          <div className="mt-10 animate-rise">
            <CheckInButton checkedToday={checkedToday} />
          </div>
        </div>
      </section>

      <div className="grid gap-12 lg:grid-cols-2">
        <section className="space-y-5">
          <div className="flex items-baseline gap-3">
            <p className="font-display text-5xl font-bold text-ink">{streak}</p>
            <p className="text-muted-foreground">day{streak === 1 ? "" : "s"} in a row of doing something</p>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Check-ins, last 4 weeks</p>
            <div className="grid w-fit grid-cols-7 gap-1.5">
              {last28(checkins).map((d) => (
                <span
                  key={d.key}
                  title={d.label}
                  className={`size-7 rounded-md ${d.on ? "bg-marigold" : "bg-muted"} ${d.today ? "ring-2 ring-ink ring-offset-2 ring-offset-background" : ""}`}
                />
              ))}
            </div>
          </div>
          {proof.length > 0 && (
            <div className="space-y-2 border-t pt-5">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Proof you&apos;re moving</p>
              <ul className="space-y-1.5 text-lg">
                {proof.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-ink">Wins</h2>
          <p className="text-sm text-muted-foreground">
            Write down anything that went right. A recruiter call, a problem you finally solved, a good mock answer.
          </p>
          <WinForm />
          {wins.length > 0 && (
            <ul className="stagger space-y-2">
              {wins.map((w) => (
                <li key={w.id} className="rounded-xl border bg-card px-4 py-3">
                  <p>{w.text}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(`${w.at}Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
