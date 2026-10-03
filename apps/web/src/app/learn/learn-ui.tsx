"use client";

import type { GapCount, LearnResource } from "@career-os/engine";
import { BookOpen, Check, ExternalLink, PlayCircle, Plus, Trash2, Wand2, Wrench } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addLearningItem, deleteLearningItem, generateLearningPlan, logStudy, setLearningStatus } from "@/app/actions/learn";
import { EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LearningItem } from "@/lib/learning";
import { cn } from "@/lib/utils";

type Result = { ok: boolean; message?: string; error?: string };

function useAction() {
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<Result>, onOk?: () => void) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error);
      else {
        if (res.message) toast.success(res.message);
        onOk?.();
      }
    });
  return { pending, run };
}

const KIND_ICON = {
  video: PlayCircle,
  course: BookOpen,
  docs: BookOpen,
  practice: Wrench,
} as const;

const KIND_LABEL = {
  video: "Video",
  course: "Course",
  docs: "Docs",
  practice: "Practice",
} as const;

function ResourceLinks({ resources }: { resources: LearnResource[] }) {
  if (!resources.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {resources.map((r) => {
        const Icon = KIND_ICON[r.kind] ?? ExternalLink;
        return (
          <li key={r.url}>
            <a
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border bg-background px-2 py-1 text-xs font-medium text-ink transition-colors hover:border-ink/40 hover:bg-muted"
            >
              <Icon className="size-3.5 shrink-0 text-marigold" />
              <span className="text-muted-foreground">{KIND_LABEL[r.kind] ?? "Link"} ·</span>
              <span className="max-w-[14rem] truncate">{r.label}</span>
              <ExternalLink className="size-3 shrink-0 opacity-50" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function GeneratePlanButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="lg"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await generateLearningPlan();
          if (res.ok) toast.success(res.message);
          else toast.error(res.error);
        })
      }
    >
      <Wand2 /> {pending ? "Generating…" : "Generate plan"}
    </Button>
  );
}

export function GapList({ gaps, onList }: { gaps: GapCount[]; onList: string[] }) {
  const { pending, run } = useAction();
  if (gaps.length === 0) {
    return <EmptyState title="No gaps yet">Run a search and upload your resume. Gaps show up once jobs are scored.</EmptyState>;
  }
  const max = gaps[0].jobs;
  return (
    <ul className="stagger space-y-2">
      {gaps.map((g) => {
        const added = onList.includes(g.skill.toLowerCase());
        return (
          <li key={g.skill} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-medium">{g.skill}</p>
                <p className="text-xs text-muted-foreground">
                  {g.jobs} job{g.jobs === 1 ? "" : "s"}
                </p>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-marigold animate-grow-x" style={{ width: `${(g.jobs / max) * 100}%` }} />
              </div>
            </div>
            <Button
              size="sm"
              variant={added ? "ghost" : "outline"}
              disabled={pending || added}
              onClick={() => run(() => addLearningItem({ skill: g.skill }))}
            >
              {added ? <Check /> : <Plus />} {added ? "On list" : "Learn"}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

const STATUS_NEXT: Record<LearningItem["status"], LearningItem["status"]> = { todo: "doing", doing: "done", done: "todo" };
const STATUS_TEXT: Record<LearningItem["status"], string> = { todo: "Not started", doing: "In progress", done: "Done" };

export function LearningList({ items }: { items: LearningItem[] }) {
  const { pending, run } = useAction();
  const [skill, setSkill] = useState("");

  return (
    <div className="space-y-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addLearningItem({ skill }), () => setSkill(""));
        }}
      >
        <Input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="Add something to learn, like System design" />
        <Button type="submit" disabled={pending || !skill.trim()}>
          Add
        </Button>
      </form>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing on your list yet. Press Generate plan, or pick a gap on the left — each item gets videos and practice sites.
        </p>
      ) : (
        <ul className="stagger space-y-3">
          {items.map((it) => (
            <li key={it.id} className="group rounded-xl border bg-card px-4 py-3">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => run(() => setLearningStatus(it.id, STATUS_NEXT[it.status]))}
                  className={cn(
                    "mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold transition-colors",
                    it.status === "done" && "bg-leaf/15 text-leaf",
                    it.status === "doing" && "bg-accent text-accent-foreground",
                    it.status === "todo" && "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {STATUS_TEXT[it.status]}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("font-medium", it.status === "done" && "text-muted-foreground line-through")}>{it.title}</p>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="font-mono text-xs text-muted-foreground">{Math.round(it.minutes / 6) / 10}h</span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove"
                        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        onClick={() => run(() => deleteLearningItem(it.id))}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                  {it.notes ? <p className="mt-1 text-sm text-muted-foreground">{it.notes}</p> : null}
                  <ResourceLinks resources={it.resources} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StudyLogForm({ items }: { items: { id: number; title: string }[] }) {
  const { pending, run } = useAction();
  const [minutes, setMinutes] = useState("30");
  const [note, setNote] = useState("");
  const [itemId, setItemId] = useState<string>("");

  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => logStudy({ minutes: Number(minutes), note, itemId: itemId ? Number(itemId) : null }), () => setNote(""));
      }}
    >
      <div className="flex gap-1.5">
        {[15, 30, 60, 90].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMinutes(String(m))}
            className={cn(
              "rounded-lg border px-2.5 py-1 font-mono text-sm transition-colors",
              minutes === String(m) ? "border-ink bg-ink text-primary-foreground" : "hover:border-ink/50",
            )}
          >
            {m}m
          </button>
        ))}
      </div>
      <select
        value={itemId}
        onChange={(e) => setItemId(e.target.value)}
        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
      >
        <option value="">General study</option>
        {items.map((i) => (
          <option key={i.id} value={i.id}>
            {i.title}
          </option>
        ))}
      </select>
      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you do? (optional)" className="flex-1" />
      <Button type="submit" disabled={pending}>
        Log session
      </Button>
    </form>
  );
}
