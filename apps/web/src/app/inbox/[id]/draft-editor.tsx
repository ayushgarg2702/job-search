"use client";

import type { DraftPack, JobStatus } from "@career-os/shared";
import { Copy, Eye, Loader2, PenLine, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import { marked } from "marked";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { approve, decline, saveDraftEdits, writeDraft } from "@/app/actions/jobs";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

function copy(text: string) {
  void navigator.clipboard.writeText(text).then(() => toast.success("Copied."));
}

export function DraftEditor({ jobId, pack }: { jobId: number; pack: DraftPack }) {
  const [draft, setDraft] = useState(pack);
  const [preview, setPreview] = useState(true);
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(draft) !== JSON.stringify(pack);
  const words = draft.coverLetter.split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-4 animate-rise">
      <Tabs defaultValue="resume">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="resume">Resume</TabsTrigger>
            <TabsTrigger value="cover">Cover letter</TabsTrigger>
            <TabsTrigger value="answers">Form answers</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPreview((p) => !p)}>
              {preview ? <PenLine /> : <Eye />} {preview ? "Edit" : "Preview"}
            </Button>
            {dirty && (
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const res = await saveDraftEdits(jobId, draft);
                    if (res.ok) toast.success("Draft saved.");
                    else toast.error(res.error);
                  })
                }
              >
                Save changes
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="resume" className="mt-3">
          {preview ? (
            <article
              className="prose-draft rounded-2xl border bg-white p-6 text-[0.92rem] leading-relaxed shadow-sm sm:p-8"
              dangerouslySetInnerHTML={{ __html: marked.parse(draft.resumeMarkdown, { async: false }) as string }}
            />
          ) : (
            <Textarea
              rows={28}
              className="font-mono text-sm"
              value={draft.resumeMarkdown}
              onChange={(e) => setDraft({ ...draft, resumeMarkdown: e.target.value })}
            />
          )}
        </TabsContent>

        <TabsContent value="cover" className="mt-3 space-y-2">
          {preview ? (
            <article className="rounded-2xl border bg-white p-6 text-[0.95rem] leading-relaxed whitespace-pre-wrap shadow-sm sm:p-8">
              {draft.coverLetter}
            </article>
          ) : (
            <Textarea rows={18} value={draft.coverLetter} onChange={(e) => setDraft({ ...draft, coverLetter: e.target.value })} />
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{words} words</span>
            <Button variant="ghost" size="xs" onClick={() => copy(draft.coverLetter)}>
              <Copy /> Copy
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="answers" className="mt-3">
          <ul className="space-y-3">
            {draft.answers.map((a, i) => (
              <li key={i} className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{a.question}</p>
                  <Button variant="ghost" size="xs" onClick={() => copy(a.answer)}>
                    <Copy /> Copy
                  </Button>
                </div>
                {preview ? (
                  <p className="mt-1 text-sm whitespace-pre-wrap">{a.answer}</p>
                ) : (
                  <Textarea
                    className="mt-2"
                    rows={Math.max(2, Math.ceil(a.answer.length / 80))}
                    value={a.answer}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        answers: draft.answers.map((x, idx) => (idx === i ? { ...x, answer: e.target.value } : x)),
                      })
                    }
                  />
                )}
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function DetailActions({ jobId, status, hasDraft }: { jobId: number; status: JobStatus; hasDraft: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

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
        <Loader2 className="size-4 animate-spin" /> Writing…
      </span>
    );
  }

  const applied = ["autofilling", "ready_to_submit", "submitted", "interviewing", "offer", "rejected"].includes(status);

  return (
    <div className="flex flex-wrap gap-2">
      {applied ? (
        <Link href={`/apply/${jobId}`} className={buttonVariants()}>
          Open application
        </Link>
      ) : (
        <>
          {status !== "declined" && (
            <Button variant="ghost" disabled={pending} onClick={() => setDeclining(true)}>
              <ThumbsDown /> Decline
            </Button>
          )}
          <Button variant="outline" disabled={pending} onClick={() => run(() => writeDraft(jobId))}>
            {hasDraft ? <RotateCcw /> : <PenLine />} {hasDraft ? "Rewrite" : "Write draft"}
          </Button>
          {hasDraft && (
            <Button disabled={pending} onClick={() => run(() => approve(jobId), () => router.push(`/apply/${jobId}`))}>
              <ThumbsUp /> Approve &amp; fill form
            </Button>
          )}
        </>
      )}

      <Dialog open={declining} onOpenChange={setDeclining}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline this job?</DialogTitle>
            <DialogDescription>A reason is optional. It helps the app learn what you skip.</DialogDescription>
          </DialogHeader>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Too junior, wrong city, low pay…" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeclining(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => run(() => decline(jobId, reason), () => {
                setDeclining(false);
                router.push("/inbox");
              })}
            >
              Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
