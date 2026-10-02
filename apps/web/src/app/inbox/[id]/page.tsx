import { STATUS_LABEL, formatLpa } from "@career-os/shared";
import { AlertTriangle, ArrowLeft, CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/page-header";
import { ScoreBadge, SOURCE_NAME } from "@/components/score-badge";
import { getDraft, getJob, jobEvents } from "@/lib/jobs";
import { InboxAutoRefresh } from "../inbox-actions";
import { DetailActions, DraftEditor } from "./draft-editor";

export default async function JobPage({ params }: PageProps<"/inbox/[id]">) {
  const { id } = await params;
  const job = getJob(Number(id));
  if (!job) notFound();
  const draft = getDraft(job.id);
  const ev = job.evaluation;
  const events = jobEvents(job.id);

  return (
    <div className="space-y-8">
      <InboxAutoRefresh active={job.status === "drafting"} />
      <Link href="/inbox" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Inbox
      </Link>

      <header className="flex flex-col gap-5 animate-rise sm:flex-row sm:items-start">
        <ScoreBadge score={job.score} className="size-14 text-xl" />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold text-ink">{job.title}</h1>
          <p className="mt-1 text-muted-foreground">
            {job.company} · {job.location || job.city} · {SOURCE_NAME[job.source] ?? job.source}
            {job.salary_max ? ` · up to ${formatLpa(job.salary_max)}` : ""}
          </p>
          <p className="mt-2 text-sm">
            <span className="rounded-md bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
              {STATUS_LABEL[job.status]}
            </span>
            <a
              href={job.url}
              target="_blank"
              rel="noreferrer"
              className="ml-3 inline-flex items-center gap-1 text-ink underline-offset-4 hover:underline"
            >
              Open posting <ExternalLink className="size-3.5" />
            </a>
          </p>
        </div>
        <DetailActions jobId={job.id} status={job.status} hasDraft={Boolean(draft)} />
      </header>

      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <section className="min-w-0">
          {draft ? (
            <DraftEditor jobId={job.id} pack={draft.pack} />
          ) : job.status === "drafting" ? (
            <EmptyState title="Writing your draft…">
              The drafter writes from your resume, then a critic and a voice pass cut anything that sounds generated or isn&apos;t
              backed by your resume.
            </EmptyState>
          ) : (
            <EmptyState title="No draft yet">Press Write draft to get a tailored resume, cover letter and answers.</EmptyState>
          )}
        </section>

        <aside className="space-y-8">
          {ev && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-ink">Why this score</h2>
              <ul className="space-y-1.5 text-sm">
                {ev.blockers.map((b) => (
                  <li key={b} className="flex gap-2 text-destructive">
                    <XCircle className="mt-0.5 size-4 shrink-0" /> {b}
                  </li>
                ))}
                {ev.reasons.map((r) => (
                  <li key={r} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-leaf" /> {r}
                  </li>
                ))}
              </ul>
              {ev.matched.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">You have</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ev.matched.map((s) => (
                      <span key={s} className="rounded-md bg-leaf/12 px-2 py-0.5 text-sm text-leaf">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {ev.missing.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">They also want</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ev.missing.map((s) => (
                      <span key={s} className="rounded-md bg-accent px-2 py-0.5 text-sm text-accent-foreground">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {draft && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-ink">Draft checks</h2>
              <p className="text-sm text-muted-foreground">
                {draft.source === "cursor" ? "Written by the Cursor agent." : "Built from your resume without a model."}
              </p>
              <ol className="space-y-2 text-sm">
                {draft.steps.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    {s.ok ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-leaf" />
                    ) : (
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-marigold" />
                    )}
                    <span>
                      <span className="font-medium">{s.name}.</span> {s.note}
                    </span>
                  </li>
                ))}
              </ol>
              {(draft.provenance.length > 0 || draft.voice.length > 0) && (
                <div className="rounded-xl border border-marigold/50 bg-accent/40 p-3 text-sm">
                  <p className="font-medium text-accent-foreground">Check these before approving</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {draft.provenance.map((p, i) => (
                      <li key={`p${i}`}>
                        &ldquo;{p.value}&rdquo; is not in your resume. {p.kind === "number" ? p.context : ""}
                      </li>
                    ))}
                    {[...new Set(draft.voice.map((v) => v.phrase))].map((p) => (
                      <li key={p}>Sounds generated: &ldquo;{p}&rdquo;</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <details className="rounded-xl border bg-card p-4">
            <summary className="cursor-pointer font-medium">Job description</summary>
            <div className="mt-3 max-h-[28rem] overflow-y-auto text-sm whitespace-pre-wrap text-muted-foreground">
              {job.description || "The board did not include a description. Open the posting to read it."}
            </div>
          </details>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-ink">History</h2>
            <ol className="space-y-1 text-sm text-muted-foreground">
              {events.map((e, i) => (
                <li key={i}>
                  <span className="font-mono text-xs">
                    {new Date(`${e.at}Z`).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                  </span>{" "}
                  {STATUS_LABEL[e.status]}
                  {e.note ? ` · ${e.note}` : ""}
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
