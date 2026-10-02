import { QUESTION_BANK, TRACK_LABEL, type QuestionTrack } from "@career-os/engine";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { listJobs } from "@/lib/jobs";
import { cn } from "@/lib/utils";
import { StartMockForm } from "./start-form";

type SessionRow = { id: number; track: QuestionTrack; role: string; started_at: string; finished_at: string | null; avg_score: number | null };

export default async function InterviewsPage({ searchParams }: PageProps<"/interviews">) {
  const { track: trackParam } = await searchParams;
  const tracks = Object.keys(TRACK_LABEL) as QuestionTrack[];
  const track = tracks.includes(trackParam as QuestionTrack) ? (trackParam as QuestionTrack) : "behavioural";
  const questions = QUESTION_BANK.filter((q) => q.track === track);
  const sessions = db().prepare("SELECT * FROM interview_sessions ORDER BY id DESC LIMIT 8").all() as SessionRow[];
  const roles = [
    ...new Set(listJobs(["interviewing", "submitted", "ready_to_submit"], 50).map((j) => `${j.title} at ${j.company}`)),
  ].slice(0, 12);

  return (
    <>
      <PageHeader title="Interviews" lead="Read the common questions, then practise out loud with a timed dummy interview." />

      <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-ink">Sample questions</h2>
          <nav className="flex flex-wrap gap-1 rounded-xl bg-muted p-1 sm:w-fit">
            {tracks.map((t) => (
              <Link
                key={t}
                href={`/interviews?track=${t}`}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  t === track ? "bg-card text-ink shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {TRACK_LABEL[t]}
              </Link>
            ))}
          </nav>
          <ul className="stagger space-y-2">
            {questions.map((q) => (
              <li key={q.question}>
                <details className="group rounded-xl border bg-card px-4 py-3">
                  <summary className="cursor-pointer list-none font-medium marker:hidden">
                    <span className="mr-2 inline-block text-marigold transition-transform group-open:rotate-90">›</span>
                    {q.question}
                  </summary>
                  <p className="mt-2 pl-5 text-sm text-muted-foreground">{q.tip}</p>
                </details>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-8">
          <div className="space-y-4 rounded-2xl border bg-card p-5">
            <h2 className="text-xl font-semibold text-ink">Dummy interview</h2>
            <p className="text-sm text-muted-foreground">
              One question at a time, two minutes each. You get a score and notes after every answer.
            </p>
            <StartMockForm tracks={tracks.map((t) => ({ id: t, label: TRACK_LABEL[t] }))} roles={roles} defaultTrack={track} />
          </div>

          {sessions.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-ink">Past sessions</h2>
              <ul className="divide-y rounded-xl border bg-card">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <Link href={`/interviews/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/60">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{s.role || TRACK_LABEL[s.track]}</span>
                        <span className="text-xs text-muted-foreground">
                          {TRACK_LABEL[s.track]} ·{" "}
                          {new Date(`${s.started_at}Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      </span>
                      <span className="font-mono text-sm font-semibold text-ink">
                        {s.finished_at ? `${s.avg_score}/100` : "Unfinished"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
