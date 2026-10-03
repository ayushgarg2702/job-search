import { TRACK_LABEL, type QuestionTrack } from "@career-os/engine";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { getCachedQuestions } from "@/lib/interview-cache";
import { listJobs } from "@/lib/jobs";
import { getProfile } from "@/lib/store";
import { cn } from "@/lib/utils";
import { GenerateQuestionsButton } from "./generate-button";
import { StartMockForm } from "./start-form";

type SessionRow = {
  id: number;
  track: QuestionTrack;
  role: string;
  started_at: string;
  finished_at: string | null;
  avg_score: number | null;
};

export default async function InterviewsPage({ searchParams }: PageProps<"/interviews">) {
  const { track: trackParam } = await searchParams;
  const tracks = Object.keys(TRACK_LABEL) as QuestionTrack[];
  const track = tracks.includes(trackParam as QuestionTrack) ? (trackParam as QuestionTrack) : "behavioural";
  const profile = getProfile();
  const defaultRole = profile.targetTitles[0] || profile.headline || "";
  const cached = getCachedQuestions(track, defaultRole);
  const questions = cached?.questions ?? [];
  const sessions = db().prepare("SELECT * FROM interview_sessions ORDER BY id DESC LIMIT 8").all() as SessionRow[];
  const jobOptions = listJobs(["interviewing", "submitted", "ready_to_submit", "awaiting_approval"], 50).map((j) => ({
    id: j.id,
    label: `${j.title} at ${j.company}`,
  }));
  const roles = [
    ...profile.targetTitles,
    ...new Set(jobOptions.map((j) => j.label)),
  ].filter(Boolean).slice(0, 12);

  return (
    <>
      <PageHeader
        title="Interviews"
        lead={
          defaultRole
            ? `Questions and practice for ${defaultRole}. Generated from your target role — not a fixed bank.`
            : "Generate questions for the role you want, then practise out loud with a timed dummy interview."
        }
      >
        <GenerateQuestionsButton track={track} role={defaultRole} />
      </PageHeader>

      <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold text-ink">Sample questions</h2>
            {cached && (
              <p className="text-xs text-muted-foreground">
                {cached.source === "cursor" ? "Generated for you" : "Offline fallback"} ·{" "}
                {new Date(cached.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            )}
          </div>
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
          {questions.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              Press Generate questions to create a set for{" "}
              <span className="font-medium text-foreground">{defaultRole || "your target role"}</span>.
            </p>
          ) : (
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
          )}
        </section>

        <section className="space-y-8">
          <div className="space-y-4 rounded-2xl border bg-card p-5">
            <h2 className="text-xl font-semibold text-ink">Dummy interview</h2>
            <p className="text-sm text-muted-foreground">
              Fresh questions for the role (or a specific job). One at a time, two minutes each.
            </p>
            <StartMockForm
              tracks={tracks.map((t) => ({ id: t, label: TRACK_LABEL[t] }))}
              roles={roles}
              jobs={jobOptions}
              defaultTrack={track}
              defaultRole={defaultRole}
            />
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
