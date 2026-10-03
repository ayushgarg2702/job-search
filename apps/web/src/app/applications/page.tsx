import type { JobStatus } from "@career-os/shared";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { SOURCE_NAME } from "@/components/score-badge";
import { buttonVariants } from "@/components/ui/button";
import { listJobs } from "@/lib/jobs";
import { StatusMenu } from "./status-menu";

const COLUMNS: { title: string; statuses: JobStatus[]; hint: string }[] = [
  { title: "Approved", statuses: ["autofilling", "ready_to_submit"], hint: "Form filled — waiting for your Submit" },
  { title: "Submitted", statuses: ["submitted"], hint: "Waiting to hear back" },
  { title: "Interviewing", statuses: ["interviewing"], hint: "In process" },
  { title: "Offer", statuses: ["offer"], hint: "You did it" },
  { title: "Rejected", statuses: ["rejected"], hint: "Their loss" },
];

function ago(sqlDate: string) {
  const days = Math.floor((Date.now() - new Date(`${sqlDate}Z`).getTime()) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
}

export default function ApplicationsPage() {
  const jobs = listJobs(COLUMNS.flatMap((c) => c.statuses), 1000);

  return (
    <>
      <PageHeader title="Applications" lead="Everything you've approved, from filled form to offer. Move a card when you hear back." />
      {jobs.length === 0 ? (
        <EmptyState
          title="No applications yet"
          action={
            <Link href="/inbox" className={buttonVariants()}>
              Approve your first draft
            </Link>
          }
        >
          Approve a draft in the inbox and it shows up here.
        </EmptyState>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
          <div className="grid min-w-[56rem] grid-cols-5 gap-4">
            {COLUMNS.map((col) => {
              const items = jobs
                .filter((j) => col.statuses.includes(j.status))
                .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
              return (
                <section key={col.title} className="flex flex-col gap-3">
                  <header className="flex items-baseline justify-between px-1">
                    <h2 className="font-display text-base font-semibold text-ink">{col.title}</h2>
                    <span className="font-mono text-sm text-muted-foreground">{items.length}</span>
                  </header>
                  <ul className="stagger flex min-h-32 flex-col gap-2 rounded-2xl bg-muted/60 p-2">
                    {items.length === 0 && <li className="px-2 py-6 text-center text-xs text-muted-foreground">{col.hint}</li>}
                    {items.map((j) => (
                      <li key={j.id} className="rounded-xl border bg-card p-3 shadow-xs">
                        <Link href={`/apply/${j.id}`} className="block">
                          <p className="line-clamp-2 text-sm font-semibold hover:underline">{j.title}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {j.company} · {j.city}
                          </p>
                        </Link>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-[0.7rem] text-muted-foreground">
                            {SOURCE_NAME[j.source] ?? j.source} · {ago(j.updated_at)}
                          </span>
                          <StatusMenu jobId={j.id} status={j.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
