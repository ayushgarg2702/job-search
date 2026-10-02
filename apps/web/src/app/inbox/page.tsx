import type { JobStatus } from "@career-os/shared";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { ScoreBadge, SOURCE_NAME } from "@/components/score-badge";
import { buttonVariants } from "@/components/ui/button";
import { listJobs, statusCounts } from "@/lib/jobs";
import { getSettings } from "@/lib/store";
import { cn } from "@/lib/utils";
import { InboxActions, InboxAutoRefresh } from "./inbox-actions";

const TABS: { id: string; label: string; statuses: JobStatus[]; empty: string }[] = [
  { id: "ready", label: "Ready to approve", statuses: ["awaiting_approval"], empty: "No drafts waiting. Run a search, or write a draft for a scored job." },
  { id: "writing", label: "Writing", statuses: ["drafting"], empty: "Nothing is being written right now." },
  { id: "scored", label: "Scored, no draft", statuses: ["scored", "discovered"], empty: "Every scored job already has a draft." },
  { id: "declined", label: "Declined", statuses: ["declined"], empty: "You haven't declined anything." },
];

export default async function InboxPage({ searchParams }: PageProps<"/inbox">) {
  const { tab: tabParam } = await searchParams;
  const tab = TABS.find((t) => t.id === tabParam) ?? TABS[0];
  const counts = statusCounts();
  const jobs = listJobs(tab.statuses, 300);
  const threshold = getSettings().draftThreshold;

  return (
    <>
      <PageHeader
        title="Inbox"
        lead={`Jobs that score ${threshold} or more get a draft written automatically. Approve to open and fill the application, or decline.`}
      />
      <InboxAutoRefresh active={(counts.drafting ?? 0) > 0} />

      <nav className="mb-6 flex flex-wrap gap-1 rounded-xl bg-muted p-1 sm:w-fit">
        {TABS.map((t) => {
          const n = t.statuses.reduce((a, s) => a + (counts[s] ?? 0), 0);
          return (
            <Link
              key={t.id}
              href={`/inbox?tab=${t.id}`}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                t.id === tab.id ? "bg-card text-ink shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label} <span className="ml-1 font-mono text-xs">{n}</span>
            </Link>
          );
        })}
      </nav>

      {jobs.length === 0 ? (
        <EmptyState
          title={tab.empty}
          action={
            <Link href="/connections" className={buttonVariants({ variant: "outline" })}>
              Go to job boards
            </Link>
          }
        />
      ) : (
        <ul className="stagger space-y-3">
          {jobs.map((job) => (
            <li key={job.id} className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center">
              <Link href={`/inbox/${job.id}`} className="flex min-w-0 flex-1 items-start gap-4">
                <ScoreBadge score={job.score} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink hover:underline">{job.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {job.company} · {job.city} · {SOURCE_NAME[job.source] ?? job.source}
                  </p>
                  {job.evaluation && (
                    <p className="mt-1 line-clamp-1 text-sm">
                      {job.evaluation.blockers[0] ? (
                        <span className="text-destructive">{job.evaluation.blockers[0]}</span>
                      ) : (
                        job.evaluation.reasons[0]
                      )}
                    </p>
                  )}
                </div>
              </Link>
              <InboxActions jobId={job.id} status={job.status} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
