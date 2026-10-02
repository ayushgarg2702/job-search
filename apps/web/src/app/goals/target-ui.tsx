"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteTarget, setTarget } from "@/app/actions/goals";
import { ProgressLine } from "@/components/progress-line";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TargetProgress } from "@/lib/metrics";

type Metric = { id: string; label: string; unit: string };

export function TargetEditor({ targets, metrics }: { targets: TargetProgress[]; metrics: Metric[] }) {
  const unset = metrics.filter((m) => !targets.some((t) => t.metric === m.id));
  const [metric, setMetric] = useState(unset[0]?.id ?? "");
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <ul className="stagger space-y-3">
        {targets.map((t) => (
          <li key={t.id} className="group rounded-xl border bg-card p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-medium">{t.label}</p>
              <p className="font-mono text-sm tabular-nums">
                <span className="text-lg font-semibold text-ink">{t.current}</span>
                <span className="text-muted-foreground"> / {t.goalValue} {t.unit}</span>
              </p>
            </div>
            <ProgressLine value={t.current} max={t.goalValue} className="mt-3" />
            <div className="mt-3 flex items-center gap-2">
              <Input
                type="number"
                min={1}
                defaultValue={t.goalValue}
                aria-label="Change target"
                className="h-7 w-24"
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (v > 0 && v !== t.goalValue) startTransition(() => void setTarget({ metric: t.metric, goalValue: v }));
                }}
              />
              <span className="text-xs text-muted-foreground">{t.unit}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Remove target"
                className="ml-auto opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => startTransition(() => void deleteTarget(t.id))}
              >
                <Trash2 />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {unset.length > 0 && (
        <form
          className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed p-4"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await setTarget({ metric: metric || unset[0].id, goalValue: Number(value) });
              if (!res.ok) toast.error(res.error);
              else setValue("");
            });
          }}
        >
          <select
            value={metric || unset[0].id}
            onChange={(e) => setMetric(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            {unset.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <Input type="number" min={1} value={value} onChange={(e) => setValue(e.target.value)} placeholder="How many" className="w-28" />
          <Button type="submit" disabled={pending || !value}>
            Set target
          </Button>
        </form>
      )}
    </div>
  );
}
