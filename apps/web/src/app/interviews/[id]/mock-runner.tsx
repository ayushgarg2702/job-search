"use client";

import type { CoachFeedback } from "@career-os/agents";
import type { BankQuestion } from "@career-os/engine";
import { ArrowRight, CheckCircle2, CircleAlert, Lightbulb, Loader2, Timer } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { finishMock, submitAnswer } from "@/app/actions/interviews";
import { ProgressLine } from "@/components/progress-line";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Answered = { question: string; answer: string; feedback: CoachFeedback; score: number };

const LIMIT = 120;

function Feedback({ fb }: { fb: CoachFeedback }) {
  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5 animate-rise">
      <div className="flex items-baseline gap-3">
        <p className={cn("font-display text-4xl font-bold", fb.score >= 70 ? "text-leaf" : fb.score >= 50 ? "text-accent-foreground" : "text-destructive")}>
          {fb.score}
        </p>
        <p className="text-sm text-muted-foreground">
          / 100 · {fb.source === "cursor" ? "feedback from the Cursor agent" : "quick check (sign in to Cursor for detailed feedback)"}
        </p>
      </div>
      {fb.good.length > 0 && (
        <ul className="space-y-1 text-sm">
          {fb.good.map((g) => (
            <li key={g} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-leaf" /> {g}
            </li>
          ))}
        </ul>
      )}
      {fb.improve.length > 0 && (
        <ul className="space-y-1 text-sm">
          {fb.improve.map((g) => (
            <li key={g} className="flex gap-2">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-marigold" /> {g}
            </li>
          ))}
        </ul>
      )}
      {fb.better && (
        <div className="border-t pt-3">
          <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">A tighter version</p>
          <p className="text-sm whitespace-pre-wrap">{fb.better}</p>
        </div>
      )}
    </div>
  );
}

export function MockRunner({
  sessionId,
  questions,
  initialAnswers,
  finished: initiallyFinished,
  avgScore,
}: {
  sessionId: number;
  questions: BankQuestion[];
  initialAnswers: Answered[];
  finished: boolean;
  avgScore: number | null;
}) {
  const [answers, setAnswers] = useState(initialAnswers);
  const [finished, setFinished] = useState(initiallyFinished);
  const [draft, setDraft] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [showTip, setShowTip] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<CoachFeedback | null>(null);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const index = answers.length;
  const current = questions[index];
  const reviewing = lastFeedback !== null;

  useEffect(() => {
    if (finished || reviewing || !current) return;
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [index, reviewing, finished, current]);

  if (finished || !current) {
    const avg = avgScore ?? (answers.length ? Math.round(answers.reduce((a, b) => a + b.score, 0) / answers.length) : 0);
    return (
      <div className="space-y-8">
        <section className="rounded-3xl bg-ink px-6 py-10 text-primary-foreground animate-rise">
          <p className="text-sm text-primary-foreground/70">Session average</p>
          <p className="font-display text-6xl font-extrabold">{avg}</p>
          <p className="mt-2 text-primary-foreground/80">
            {avg >= 70 ? "Solid. Do one more round on a different track." : "Redo the lowest one tomorrow. It gets easier every time."}
          </p>
          {!finished && (
            <Button
              className="mt-6 bg-marigold text-ink hover:bg-marigold/90"
              onClick={() =>
                startTransition(async () => {
                  await finishMock(sessionId);
                  setFinished(true);
                })
              }
            >
              Save this session
            </Button>
          )}
        </section>
        <ol className="space-y-6">
          {answers.map((a, i) => (
            <li key={i} className="space-y-3">
              <p className="font-display text-lg font-semibold text-ink">
                {i + 1}. {a.question}
              </p>
              <p className="rounded-xl bg-muted/60 p-4 text-sm whitespace-pre-wrap">{a.answer}</p>
              <Feedback fb={a.feedback} />
            </li>
          ))}
        </ol>
        <Link href="/interviews" className={buttonVariants({ variant: "outline" })}>
          Start another
        </Link>
      </div>
    );
  }

  const over = seconds > LIMIT;
  const mm = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            Question {index + 1} of {questions.length}
          </span>
          <span className={cn("flex items-center gap-1 font-mono", over && "text-destructive")}>
            <Timer className="size-4" /> {mm} / 2:00
          </span>
        </div>
        <ProgressLine value={index} max={questions.length} className="mt-2" />
      </div>

      <h2 key={index} className="font-display text-3xl leading-tight font-bold text-ink animate-rise">
        {current.question}
      </h2>

      {!reviewing ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await submitAnswer({ sessionId, question: current.question, answer: draft, seconds });
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              if (timer.current) clearInterval(timer.current);
              setLastFeedback(res.feedback);
            });
          }}
        >
          <Textarea
            autoFocus
            rows={9}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Answer like you would out loud. Say it first, then type what you said."
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowTip((s) => !s)}>
              <Lightbulb /> {showTip ? "Hide tip" : "Show tip"}
            </Button>
            <span className="text-xs text-muted-foreground">{draft.split(/\s+/).filter(Boolean).length} words</span>
            <Button type="submit" className="ml-auto" disabled={pending || !draft.trim()}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {pending ? "Reviewing…" : "Submit answer"}
            </Button>
          </div>
          {showTip && <p className="rounded-xl bg-accent/60 p-3 text-sm text-accent-foreground">{current.tip}</p>}
        </form>
      ) : (
        <div className="space-y-4">
          <Feedback fb={lastFeedback} />
          <Button
            size="lg"
            onClick={() => {
              setAnswers([...answers, { question: current.question, answer: draft, feedback: lastFeedback, score: lastFeedback.score }]);
              setLastFeedback(null);
              setDraft("");
              setShowTip(false);
              setSeconds(0);
            }}
          >
            {index + 1 < questions.length ? "Next question" : "See results"} <ArrowRight />
          </Button>
        </div>
      )}
    </div>
  );
}
