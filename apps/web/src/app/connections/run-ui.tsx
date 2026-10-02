"use client";

import { AlertTriangle, CheckCircle2, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { startSearch } from "@/app/actions/search";
import { Button } from "@/components/ui/button";
import type { FetchRun } from "@/lib/runs";

const SOURCE_LABEL: Record<string, string> = {
  naukri: "Naukri",
  instahyre: "Instahyre",
  indeed: "Indeed India",
  linkedin: "LinkedIn",
  ats: "Company pages",
};

export function SearchButton({ initiallyRunning }: { initiallyRunning: boolean }) {
  const router = useRouter();
  const [running, setRunning] = useState(initiallyRunning);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!running) return;
    const t = setInterval(async () => {
      const res = await fetch("/api/status", { cache: "no-store" }).then((r) => r.json());
      if (!res.fetching) {
        setRunning(false);
        const run = res.lastRun as FetchRun | null;
        if (run) toast.success(`Found ${run.found} jobs, ${run.added} new.`);
        router.refresh();
      }
    }, 2500);
    return () => clearInterval(t);
  }, [running, router]);

  return (
    <Button
      size="lg"
      disabled={running || pending}
      onClick={() =>
        startTransition(async () => {
          const res = await startSearch();
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast(res.message);
          setRunning(true);
        })
      }
      className="px-5"
    >
      {running ? <Loader2 className="animate-spin" /> : <Search />}
      {running ? "Searching…" : "Search now"}
    </Button>
  );
}

export function RunLog({ runs }: { runs: FetchRun[] }) {
  if (runs.length === 0) {
    return <p className="text-sm text-muted-foreground">No searches yet. Press Search now.</p>;
  }
  return (
    <ul className="stagger space-y-3">
      {runs.map((run) => (
        <li key={run.id} className="rounded-xl border bg-card p-4">
          <div className="flex items-baseline justify-between">
            <p className="font-medium">
              {run.finished_at ? `${run.found} found · ${run.added} new` : "Running…"}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(`${run.started_at}Z`).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
          <ul className="mt-2 space-y-1">
            {run.log.map((l) => (
              <li key={l.source} className="flex items-start gap-2 text-sm">
                {l.error && l.found === 0 ? (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-marigold" />
                ) : (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-leaf" />
                )}
                <span>
                  <span className="font-medium">{SOURCE_LABEL[l.source] ?? l.source}</span>: {l.found} jobs
                  {l.error && <span className="block text-muted-foreground">{l.error}</span>}
                </span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
