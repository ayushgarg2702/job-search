import "server-only";
import type { BankQuestion, QuestionTrack } from "@career-os/engine";
import { getKv } from "./db";

export type CachedInterviewBank = {
  track: QuestionTrack;
  role: string;
  source: "cursor" | "bank";
  questions: BankQuestion[];
  at: string;
};

export function interviewCacheKey(track: string, role: string) {
  return `interview_bank:${track}:${role.trim().toLowerCase() || "default"}`;
}

export function getCachedQuestions(track: QuestionTrack, role: string): CachedInterviewBank | null {
  return getKv<CachedInterviewBank | null>(interviewCacheKey(track, role), null);
}
