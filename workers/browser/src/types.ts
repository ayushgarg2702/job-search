export type SessionRequest = {
  sessionId: number;
  jobId: number;
  url: string;
  source: string;
  callbackUrl: string;
  resumeHtml: string;
  coverLetter: string;
  answers: { question: string; answer: string }[];
  profile: {
    name: string;
    email: string;
    phone: string;
    city: string;
    linkedin: string;
    github: string;
    portfolio: string;
    yearsExperience: number;
    currentCtcInr: number | null;
    expectedCtcInr: number | null;
    noticePeriodDays: number | null;
    currentCompany: string;
    currentTitle: string;
  };
};

export type FieldInfo = {
  id: string;
  tag: "input" | "textarea" | "select";
  type: string;
  group: string;
  label: string;
  required: boolean;
  options: string[];
};

export type Filled = { label: string; value: string };
export type Skipped = { label: string; reason: string };
