"use client";

import type { JobStatus } from "@career-os/shared";
import { Loader2, PenLine, ThumbsDown, ThumbsUp, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { toast } from "sonner";
import { approve, decline, writeDraft } from "@/app/actions/jobs";
import { Button, buttonVariants } from "@/components/ui/button";

export function InboxAutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [active, router]);
  return null;
}

export function InboxActions({ jobId, status }: { jobId: number; status: JobStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, after?: () => void) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error);
      else {
        if (res.message) toast.success(res.message);
        after?.();
      }
    });

  if (status === "drafting") {
    return (
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Writing draft…
      </span>
    );
  }

  if (status === "declined") {
    return (
      <Button variant="outline" disabled={pending} onClick={() => run(() => writeDraft(jobId))}>
        <Undo2 /> Reconsider
      </Button>
    );
  }

  if (status === "scored" || status === "discovered") {
    return (
      <div className="flex gap-2">
        <Button variant="ghost" disabled={pending} onClick={() => run(() => decline(jobId))}>
          <ThumbsDown /> Decline
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => run(() => writeDraft(jobId))}>
          <PenLine /> Write draft
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button variant="ghost" disabled={pending} onClick={() => run(() => decline(jobId))}>
          <ThumbsDown /> Decline
        </Button>
        <Link href={`/inbox/${jobId}`} className={buttonVariants({ variant: "outline" })}>
          Review
        </Link>
        <Button disabled={pending} onClick={() => run(() => approve(jobId), () => router.push(`/apply/${jobId}`))}>
          <ThumbsUp /> Approve &amp; fill form
        </Button>
      </div>
      <p className="max-w-xs text-right text-xs text-muted-foreground">
        Opens a helper browser and fills fields. You click Submit — Career OS never does.
      </p>
    </div>
  );
}
