import { STATUS_LABEL } from "@career-os/shared";
import { AlertTriangle, ArrowLeft, CheckCircle2, CircleDashed, ExternalLink, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { latestSession } from "@/lib/apply";
import { getDraft, getJob } from "@/lib/jobs";
import { AnswerQuestionsButton, ApplyActions, CopyButton, SessionPoller } from "./apply-ui";

export default async function ApplyPage({ params }: PageProps<"/apply/[id]">) {
  const { id } = await params;
  const job = getJob(Number(id));
  if (!job) notFound();
  const session = latestSession(job.id);
  const draft = getDraft(job.id);
  const live = session && ["starting", "opening", "filling"].includes(session.status);
  const known = new Set(draft?.pack.answers.map((a) => a.question) ?? []);
  const openQuestions =
    session?.skipped.filter((s) => /no answer/i.test(s.reason) && s.label.length > 12 && !known.has(s.label)).length ?? 0;

  return (
    <div className="space-y-8">
      <SessionPoller active={Boolean(live)} />
      <Link href={`/inbox/${job.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to the draft
      </Link>

      <header className="animate-rise">
        <p className="text-sm font-medium text-muted-foreground">{STATUS_LABEL[job.status]}</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">
          {job.title} <span className="text-muted-foreground">at {job.company}</span>
        </h1>
        <a
          href={job.apply_url || job.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-sm text-ink underline-offset-4 hover:underline"
        >
          Open the application yourself <ExternalLink className="size-3.5" />
        </a>
      </header>

      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5 animate-rise sm:flex-row sm:items-center">
        <div className="flex flex-1 items-start gap-3">
          {live ? (
            <Loader2 className="mt-0.5 size-6 shrink-0 animate-spin text-ink" />
          ) : session?.status === "ready" ? (
            <span className="relative mt-1 grid size-4 shrink-0 place-items-center rounded-full bg-marigold animate-pulse-ring" />
          ) : session?.status === "failed" ? (
            <AlertTriangle className="mt-0.5 size-6 shrink-0 text-marigold" />
          ) : (
            <CircleDashed className="mt-0.5 size-6 shrink-0 text-muted-foreground" />
          )}
          <div>
            <p className="font-display text-lg font-semibold text-ink">
              {job.status === "submitted"
                ? "Submitted. Nice."
                : live
                  ? "Working on it…"
                  : session?.status === "ready"
                    ? "Waiting for you to press Submit"
                    : session?.status === "failed"
                      ? "Autofill stopped"
                      : "Not started"}
            </p>
            <p className="text-sm text-muted-foreground">
              {session?.message || "Approve the draft to open and fill the application, or fill it yourself with the answers below."}
            </p>
          </div>
        </div>
        <ApplyActions jobId={job.id} status={job.status} hasSession={Boolean(session)} />
      </section>

      {session && session.warnings.length > 0 && (
        <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
          <p className="flex items-center gap-2 font-semibold text-destructive">
            <AlertTriangle className="size-4" /> Before you submit
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
            {session.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-10 lg:grid-cols-2">
        <section className="space-y-4">
          {session && (session.filled.length > 0 || session.skipped.length > 0) && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-ink">What got filled</h2>
                {openQuestions > 0 && <AnswerQuestionsButton jobId={job.id} count={openQuestions} />}
              </div>
              <ul className="space-y-1.5 text-sm">
                {session.filled.map((f, i) => (
                  <li key={`f${i}`} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-leaf" />
                    <span>
                      <span className="font-medium">{f.label}</span>: <span className="text-muted-foreground">{f.value}</span>
                    </span>
                  </li>
                ))}
                {session.skipped.map((f, i) => (
                  <li key={`s${i}`} className="flex gap-2">
                    <CircleDashed className="mt-0.5 size-4 shrink-0 text-marigold" />
                    <span>
                      <span className="font-medium">{f.label}</span>: <span className="text-muted-foreground">{f.reason}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {draft && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-ink">Your answers</h2>
              <ul className="divide-y rounded-xl border bg-card">
                {draft.pack.answers.map((a, i) => (
                  <li key={i} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{a.question}</p>
                      <p className="mt-0.5 text-sm">{a.answer}</p>
                    </div>
                    <CopyButton text={a.answer} />
                  </li>
                ))}
                <li className="flex items-center gap-3 px-4 py-3">
                  <p className="flex-1 text-sm font-medium">Cover letter</p>
                  <CopyButton text={draft.pack.coverLetter} />
                </li>
                <li className="flex items-center gap-3 px-4 py-3">
                  <p className="flex-1 text-sm font-medium">Tailored resume (PDF)</p>
                  <a
                    href={`/api/resume/${job.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-ink underline-offset-4 hover:underline"
                  >
                    <FileText className="size-4" /> Open
                  </a>
                </li>
              </ul>
            </div>
          )}
        </section>

        <section>
          {session?.screenshot ? (
            <figure className="space-y-2">
              <h2 className="text-lg font-semibold text-ink">The form as it was left</h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/screenshots/${session.screenshot}?v=${encodeURIComponent(session.updated_at)}`}
                alt="Screenshot of the filled application form"
                className="max-h-[42rem] w-full rounded-xl border object-cover object-top shadow-sm"
              />
              <figcaption className="text-xs text-muted-foreground">
                The live window is still open in the autofill browser. Nothing was submitted.
              </figcaption>
            </figure>
          ) : (
            <p className="text-sm text-muted-foreground">A screenshot of the filled form shows up here.</p>
          )}
        </section>
      </div>
    </div>
  );
}
