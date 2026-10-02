import type { CoachFeedback } from "@career-os/agents";
import { TRACK_LABEL, type BankQuestion, type QuestionTrack } from "@career-os/engine";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { MockRunner } from "./mock-runner";

export default async function MockPage({ params }: PageProps<"/interviews/[id]">) {
  const { id } = await params;
  const session = db().prepare("SELECT * FROM interview_sessions WHERE id = ?").get(Number(id)) as
    | { id: number; track: QuestionTrack; role: string; questions: string; finished_at: string | null; avg_score: number | null }
    | undefined;
  if (!session) notFound();
  const questions = JSON.parse(session.questions) as BankQuestion[];
  const answers = (
    db().prepare("SELECT question, answer, feedback, score FROM interview_answers WHERE session_id = ? ORDER BY id").all(session.id) as {
      question: string;
      answer: string;
      feedback: string;
      score: number;
    }[]
  ).map((a) => ({ ...a, feedback: JSON.parse(a.feedback) as CoachFeedback }));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link href="/interviews" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Interviews
      </Link>
      <header className="animate-rise">
        <p className="text-sm font-medium text-muted-foreground">{TRACK_LABEL[session.track]} round</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">{session.role || "Dummy interview"}</h1>
      </header>
      <MockRunner
        sessionId={session.id}
        questions={questions}
        initialAnswers={answers}
        finished={Boolean(session.finished_at)}
        avgScore={session.avg_score}
      />
    </div>
  );
}
