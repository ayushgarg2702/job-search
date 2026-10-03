import type { JobStatus } from "@career-os/shared";
import { SOURCES } from "@career-os/shared";
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

const SOURCE_IDS = new Set(SOURCES.map((s) => s.id));

function hrefFor(tab: string, source: string | null) {
  const q = new URLSearchParams();
  q.set("tab", tab);
  if (source) q.set("source", source);
  return `/inbox?${q.toString()}`;
}

export default async function InboxPage({ searchParams }: PageProps<"/inbox">) {
  const { tab: tabParam, source: sourceParam } = await searchParams;
  const tab = TABS.find((t) => t.id === tabParam) ?? TABS[0];
  const sourceFilter =
    typeof sourceParam === "string" && SOURCE_IDS.has(sourceParam as (typeof SOURCES)[number]["id"])
      ? sourceParam
      : null;

  const counts = statusCounts();
  const allInTab = listJobs(tab.statuses, 500);
  const bySource = new Map<string, number>();
  for (const j of allInTab) bySource.set(j.source, (bySource.get(j.source) ?? 0) + 1);
  const jobs = sourceFilter ? allInTab.filter((j) => j.source === sourceFilter) : allInTab;
  const threshold = getSettings().draftThreshold;

  const sourceChips = [
    { id: null as string | null, label: "All boards", count: allInTab.length },
    ...SOURCES.map((s) => ({
      id: s.id as string | null,
      label: SOURCE_NAME[s.id] ?? s.label,
      count: bySource.get(s.id) ?? 0,
    })).filter((s) => s.count > 0 || s.id === sourceFilter),
  ];

  return (
    <>
      <PageHeader
        title="Inbox"
        lead={`Jobs that score ${threshold} or more get a draft written automatically. Approve to open and fill the application, or decline.`}
      />
      <InboxAutoRefresh active={(counts.drafting ?? 0) > 0} />

      <nav className="mb-4 flex flex-wrap gap-1 rounded-xl bg-muted p-1 sm:w-fit">
        {TABS.map((t) => {
          const n = t.statuses.reduce((a, s) => a + (counts[s] ?? 0), 0);
          return (
            <Link
              key={t.id}
              href={hrefFor(t.id, sourceFilter)}
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

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Found on</span>
        {sourceChips.map((s) => (
          <Link
            key={s.id ?? "all"}
            href={hrefFor(tab.id, s.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              (s.id ?? null) === sourceFilter
                ? "border-ink bg-ink text-primary-foreground"
                : "bg-card text-muted-foreground hover:border-ink/40 hover:text-foreground",
            )}
          >
            {s.label}
            <span className="ml-1.5 font-mono text-xs opacity-80">{s.count}</span>
          </Link>
        ))}
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          title={
            sourceFilter
              ? `No ${SOURCE_NAME[sourceFilter] ?? sourceFilter} jobs in this tab.`
              : tab.empty
          }
          action={
            sourceFilter ? (
              <Link href={hrefFor(tab.id, null)} className={buttonVariants({ variant: "outline" })}>
                Clear board filter
              </Link>
            ) : (
              <Link href="/connections" className={buttonVariants({ variant: "outline" })}>
                Go to job boards
              </Link>
            )
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
