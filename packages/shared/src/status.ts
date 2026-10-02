export const JOB_STATUSES = [
  "discovered",
  "scored",
  "drafting",
  "draft_ready",
  "awaiting_approval",
  "declined",
  "autofilling",
  "ready_to_submit",
  "submitted",
  "interviewing",
  "offer",
  "rejected",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const STATUS_LABEL: Record<JobStatus, string> = {
  discovered: "Found",
  scored: "Scored",
  drafting: "Writing draft",
  draft_ready: "Draft ready",
  awaiting_approval: "Waiting for you",
  declined: "Declined",
  autofilling: "Filling form",
  ready_to_submit: "Waiting for Submit",
  submitted: "Submitted",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
};

/** Statuses you can set by hand from the tracker. The rest are set by the app. */
export const MANUAL_STATUSES: JobStatus[] = [
  "submitted",
  "interviewing",
  "offer",
  "rejected",
  "declined",
];

/** Order used by the funnel graph. */
export const FUNNEL_STAGES: { key: string; label: string; from: JobStatus[] }[] = [
  {
    key: "found",
    label: "Found",
    from: [...JOB_STATUSES],
  },
  {
    key: "drafted",
    label: "Drafted",
    from: [
      "draft_ready",
      "awaiting_approval",
      "autofilling",
      "ready_to_submit",
      "submitted",
      "interviewing",
      "offer",
      "rejected",
    ],
  },
  {
    key: "approved",
    label: "Approved",
    from: ["autofilling", "ready_to_submit", "submitted", "interviewing", "offer", "rejected"],
  },
  {
    key: "submitted",
    label: "Submitted",
    from: ["submitted", "interviewing", "offer", "rejected"],
  },
  { key: "interviewing", label: "Interviews", from: ["interviewing", "offer"] },
  { key: "offer", label: "Offers", from: ["offer"] },
];
