"use client";

import { Check, Plus, Trash2, Wand2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addRoadmapItem, deleteRoadmapItem, generateRoadmap, toggleRoadmapItem } from "@/app/actions/learn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { RoadmapRow } from "./page";

export function BuildRoadmapButton({ hasItems }: { hasItems: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="lg"
      variant={hasItems ? "outline" : "default"}
      disabled={pending}
      onClick={() => {
        if (hasItems && !confirm("Rebuild the roadmap? Steps you've finished are kept.")) return;
        startTransition(async () => {
          const res = await generateRoadmap();
          if (res.ok) toast.success(res.message);
          else toast.error(res.error);
        });
      }}
    >
      <Wand2 /> {hasItems ? "Rebuild" : "Build my roadmap"}
    </Button>
  );
}

export function RoadmapPhase({ phase, items }: { phase: number; items: RoadmapRow[] }) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const allDone = items.every((i) => i.done);

  return (
    <li className="animate-rise">
      <span
        className={cn(
          "absolute -left-[1.07rem] grid size-8 place-items-center rounded-full border-2 font-display text-sm font-bold",
          allDone ? "border-leaf bg-leaf text-white" : "border-ink bg-background text-ink",
        )}
      >
        {allDone ? <Check className="size-4" /> : phase}
      </span>
      <h2 className="text-xl font-semibold text-ink">{items[0]?.phase_title}</h2>
      <ul className="mt-4 space-y-2">
        {items.map((it) => (
          <li key={it.id} className="group flex items-start gap-3 rounded-xl border bg-card p-4">
            <button
              type="button"
              aria-label={it.done ? "Mark not done" : "Mark done"}
              onClick={() => startTransition(() => void toggleRoadmapItem(it.id, !it.done))}
              className={cn(
                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors",
                it.done ? "border-leaf bg-leaf text-white" : "border-ink/40 hover:border-ink",
              )}
            >
              {it.done ? <Check className="size-3.5" /> : null}
            </button>
            <div className="min-w-0 flex-1">
              <p className={cn("font-medium", it.done && "text-muted-foreground line-through")}>{it.title}</p>
              {it.detail && <p className="mt-0.5 text-sm text-muted-foreground">{it.detail}</p>}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Delete step"
              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              onClick={() => startTransition(() => void deleteRoadmapItem(it.id))}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const res = await addRoadmapItem({ phase, title });
            if (!res.ok) toast.error(res.error);
            else setTitle("");
          });
        }}
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add your own step" className="h-8" />
        <Button type="submit" variant="ghost" size="sm" disabled={pending || !title.trim()}>
          <Plus /> Add
        </Button>
      </form>
    </li>
  );
}
