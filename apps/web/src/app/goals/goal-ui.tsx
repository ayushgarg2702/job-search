"use client";

import { Check, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addGoal, deleteGoal, toggleGoal } from "@/app/actions/goals";
import { EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Goal } from "@/lib/goals";
import { cn } from "@/lib/utils";

export function GoalForm() {
  const [title, setTitle] = useState("");
  const [why, setWhy] = useState("");
  const [date, setDate] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3 rounded-xl border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await addGoal({ title, why, targetDate: date || null });
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          setTitle("");
          setWhy("");
          setDate("");
        });
      }}
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Senior backend role at a product company in Bengaluru, 30 LPA+"
      />
      <Textarea rows={2} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Why this matters to you (optional)" />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          By
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
        </label>
        <Button type="submit" disabled={pending || !title.trim()} className="ml-auto">
          Add goal
        </Button>
      </div>
    </form>
  );
}

export function GoalList({ goals }: { goals: Goal[] }) {
  const [, startTransition] = useTransition();
  if (goals.length === 0) {
    return <EmptyState title="No goals yet">Write one sentence about the job you want. The roadmap is built from it.</EmptyState>;
  }
  return (
    <ul className="stagger space-y-2">
      {goals.map((g) => (
        <li key={g.id} className="group flex items-start gap-3 rounded-xl border bg-card p-4">
          <button
            type="button"
            aria-label={g.done ? "Mark not done" : "Mark done"}
            onClick={() => startTransition(() => void toggleGoal(g.id, !g.done))}
            className={cn(
              "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors",
              g.done ? "border-leaf bg-leaf text-white" : "border-ink/40 hover:border-ink",
            )}
          >
            {g.done ? <Check className="size-3.5" /> : null}
          </button>
          <div className="min-w-0 flex-1">
            <p className={cn("font-medium", g.done && "text-muted-foreground line-through")}>{g.title}</p>
            {g.why && <p className="mt-1 text-sm text-muted-foreground">{g.why}</p>}
            {g.target_date && (
              <p className="mt-1 text-xs text-muted-foreground">
                By {new Date(g.target_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete goal"
            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            onClick={() => startTransition(() => void deleteGoal(g.id))}
          >
            <Trash2 />
          </Button>
        </li>
      ))}
    </ul>
  );
}
