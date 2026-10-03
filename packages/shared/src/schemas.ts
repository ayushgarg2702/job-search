import { z } from "zod";
import { JOB_STATUSES } from "./status";

export const ExperienceSchema = z.object({
  title: z.string().default(""),
  company: z.string().default(""),
  start: z.string().default(""),
  end: z.string().default(""),
  bullets: z.array(z.string()).default([]),
});
export type Experience = z.infer<typeof ExperienceSchema>;

export const ProfileSchema = z.object({
  name: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  city: z.string().default("Bengaluru"),
  linkedin: z.string().default(""),
  github: z.string().default(""),
  portfolio: z.string().default(""),
  headline: z.string().default(""),
  summary: z.string().default(""),
  yearsExperience: z.number().min(0).max(60).default(0),
  skills: z.array(z.string()).default([]),
  experience: z.array(ExperienceSchema).default([]),
  education: z.array(z.string()).default([]),
  currentCtcInr: z.number().nullable().default(null),
  expectedCtcInr: z.number().nullable().default(null),
  noticePeriodDays: z.number().nullable().default(null),
  preferredCities: z.array(z.string()).default(["Bengaluru", "Remote (India)"]),
  targetTitles: z.array(z.string()).default([]),
  resumeText: z.string().default(""),
  resumeFileName: z.string().default(""),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const GoalSchema = z.object({
  title: z.string().min(1),
  why: z.string().default(""),
  targetDate: z.string().nullable().default(null),
  done: z.boolean().default(false),
});
export type GoalInput = z.infer<typeof GoalSchema>;

export const TARGET_METRICS = [
  { id: "applications_week", label: "Applications sent this week", unit: "applications" },
  { id: "interviews_month", label: "Interviews this month", unit: "interviews" },
  { id: "study_minutes_week", label: "Study time this week", unit: "minutes" },
  { id: "mock_interviews_week", label: "Mock interviews this week", unit: "sessions" },
] as const;
export type TargetMetric = (typeof TARGET_METRICS)[number]["id"];

export const TargetSchema = z.object({
  metric: z.enum(TARGET_METRICS.map((m) => m.id) as [TargetMetric, ...TargetMetric[]]),
  goalValue: z.number().int().positive(),
});
export type TargetInput = z.infer<typeof TargetSchema>;

export const JobStatusSchema = z.enum(JOB_STATUSES);

export const SearchConfigSchema = z.object({
  searchTerms: z.array(z.string()).default([]),
  locations: z.array(z.string()).default(["Bengaluru", "Remote"]),
  sources: z.array(z.string()).default(["naukri", "instahyre", "indeed", "linkedin", "ats"]),
  atsCompanies: z
    .array(z.object({ provider: z.enum(["greenhouse", "lever", "ashby"]), slug: z.string() }))
    .default([]),
  hoursOld: z.number().int().positive().default(72),
  resultsPerSource: z.number().int().positive().max(100).default(20),
  autoFetchHours: z.number().int().min(0).default(0),
});
export type SearchConfig = z.infer<typeof SearchConfigSchema>;

export const SettingsSchema = z.object({
  draftThreshold: z.number().min(0).max(100).default(55),
  autoDraft: z.boolean().default(true),
  cursorModel: z.string().default(""),
  jobspyUrl: z.string().default("http://127.0.0.1:43124"),
  browserWorkerUrl: z.string().default("http://127.0.0.1:43125"),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const AnswerSchema = z.object({ question: z.string(), answer: z.string() });
export type Answer = z.infer<typeof AnswerSchema>;

export const DraftPackSchema = z.object({
  resumeMarkdown: z.string(),
  coverLetter: z.string(),
  answers: z.array(AnswerSchema),
});
export type DraftPack = z.infer<typeof DraftPackSchema>;

export const NormalizedJobSchema = z.object({
  source: z.string(),
  externalId: z.string().nullable().default(null),
  title: z.string(),
  company: z.string(),
  location: z.string().default(""),
  url: z.string(),
  applyUrl: z.string().nullable().default(null),
  description: z.string().default(""),
  salaryMinInr: z.number().nullable().default(null),
  salaryMaxInr: z.number().nullable().default(null),
  isRemote: z.boolean().default(false),
  postedAt: z.string().nullable().default(null),
});
export type NormalizedJob = z.infer<typeof NormalizedJobSchema>;
