"use client";

import type { QuestionTrack } from "@career-os/engine";
import { Wand2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { generateSampleQuestions } from "@/app/actions/interviews";
import { Button } from "@/components/ui/button";

export function GenerateQuestionsButton({ track, role }: { track: QuestionTrack; role: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="lg"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await generateSampleQuestions({ track, role });
          if (res.ok) toast.success(res.message);
          else toast.error(res.error);
        })
      }
    >
      <Wand2 /> {pending ? "Generating…" : "Generate questions"}
    </Button>
  );
}
