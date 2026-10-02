"use client";

import type { JobStatus } from "@career-os/shared";
import { Check, Copy, Loader2, PenLine, RotateCcw, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { answerOpenQuestions, approve, fillMyself, markStatus } from "@/app/actions/jobs";
import { Button } from "@/components/ui/button";

export function SessionPoller({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(t);
  }, [active, router]);
  return null;
}

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Copy"
      onClick={() =>
        void navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        })
      }
    >
      {done ? <Check className="text-leaf" /> : <Copy />}
    </Button>
  );
}

export function AnswerQuestionsButton({ jobId, count }: { jobId: number; count: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await answerOpenQuestions(jobId);
          if (!res.ok) toast.error(res.error);
          else {
            toast.success(res.message);
            router.refresh();
          }
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <PenLine />}
      {pending ? "Writing…" : `Write answers for ${count} open question${count === 1 ? "" : "s"}`}
    </Button>
  );
}

export function ApplyActions({ jobId, status, hasSession }: { jobId: number; status: JobStatus; hasSession: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, okMsg?: string) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(okMsg ?? res.message ?? "Done.");
        router.refresh();
      }
    });

  if (["submitted", "interviewing", "offer", "rejected"].includes(status)) {
    return (
      <Button variant="outline" onClick={() => router.push("/applications")}>
        See all applications
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {hasSession ? (
        <Button variant="ghost" disabled={pending} onClick={() => run(() => approve(jobId))}>
          <RotateCcw /> Fill again
        </Button>
      ) : (
        <Button variant="ghost" disabled={pending} onClick={() => run(() => fillMyself(jobId), "Marked as filling it yourself.")}>
          I&apos;ll fill it myself
        </Button>
      )}
      <Button disabled={pending} onClick={() => run(() => markStatus(jobId, "submitted"), "Logged as submitted.")}>
        <Send /> I submitted it
      </Button>
    </div>
  );
}
