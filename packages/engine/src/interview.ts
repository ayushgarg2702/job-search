export type QuestionTrack = "behavioural" | "hr_india" | "backend" | "frontend" | "data" | "product";

export const TRACK_LABEL: Record<QuestionTrack, string> = {
  behavioural: "Behavioural",
  hr_india: "HR round",
  backend: "Backend",
  frontend: "Frontend",
  data: "Data / ML",
  product: "Product",
};

export type BankQuestion = { track: QuestionTrack; question: string; tip: string };

export const QUESTION_BANK: BankQuestion[] = [
  { track: "behavioural", question: "Tell me about yourself.", tip: "Two minutes. Current role, one thing you are proud of, why this role next." },
  { track: "behavioural", question: "Tell me about a time you disagreed with your manager.", tip: "Say what you disagreed on, how you raised it, and what happened. Do not make them the villain." },
  { track: "behavioural", question: "Describe a production issue you handled.", tip: "What broke, how you found it, the fix, and what you changed so it would not happen again." },
  { track: "behavioural", question: "What is a project you would do differently now?", tip: "Pick a real mistake. Show what you learned, not just what went wrong." },
  { track: "behavioural", question: "How do you handle a tight deadline with unclear requirements?", tip: "Talk about what you cut, who you asked, and how you kept people updated." },
  { track: "hr_india", question: "What is your current CTC and expected CTC?", tip: "Give fixed and variable separately. Have a number ready, not a range that starts low." },
  { track: "hr_india", question: "What is your notice period? Can it be bought out?", tip: "Know your exact notice period and whether your company allows buyout or early release." },
  { track: "hr_india", question: "Why are you looking for a change?", tip: "Talk about what you want next, not what you dislike about the current job." },
  { track: "hr_india", question: "Do you have any other offers?", tip: "Be honest. If you have one, say so without using it as a threat." },
  { track: "hr_india", question: "Are you open to relocating or working from office?", tip: "Say exactly what you can do: days in office, cities, timeline." },
  { track: "backend", question: "How would you design a URL shortener?", tip: "Cover ID generation, storage, redirects, caching and how you would handle 10x traffic." },
  { track: "backend", question: "What happens when you type a URL in the browser and press enter?", tip: "DNS, TCP/TLS, HTTP request, server, response, rendering. Go as deep as they let you." },
  { track: "backend", question: "How do you make an API idempotent?", tip: "Idempotency keys, upserts, and what you store to detect a retry." },
  { track: "backend", question: "SQL vs NoSQL: how do you choose?", tip: "Talk about access patterns, consistency needs and joins with a real example." },
  { track: "backend", question: "How would you find why an endpoint got slow?", tip: "Metrics first, then traces, then query plans. Say what you would check in order." },
  { track: "frontend", question: "How does React decide what to re-render?", tip: "State and props changes, reconciliation, keys, and how you would avoid wasted renders." },
  { track: "frontend", question: "How would you make a slow page load faster?", tip: "Measure first (LCP, bundle size), then split code, defer scripts, optimise images." },
  { track: "frontend", question: "Explain the event loop.", tip: "Call stack, task queue, microtasks. Use a small setTimeout vs Promise example." },
  { track: "frontend", question: "How do you manage state in a large app?", tip: "Server state vs UI state, where each lives, and when a global store is worth it." },
  { track: "data", question: "How do you handle missing values in a dataset?", tip: "Depends on why they are missing. Mention dropping, imputing, and flag columns." },
  { track: "data", question: "Explain precision vs recall with an example.", tip: "Use a real case like fraud detection and say which one matters more there." },
  { track: "data", question: "How would you know if a model is overfitting?", tip: "Train vs validation gap, cross-validation, and what you would change." },
  { track: "data", question: "Write a SQL query to find the second highest salary.", tip: "Show one way with a window function and one with a subquery." },
  { track: "product", question: "How would you improve UPI payments in an app you use?", tip: "Pick one user, one problem, one change, and how you would measure it." },
  { track: "product", question: "A key metric dropped 20% overnight. What do you do?", tip: "Check data first, then segment by platform, region and release before guessing." },
  { track: "product", question: "How do you decide what not to build?", tip: "Talk about impact vs effort and saying no with a reason." },
];

export type AnswerFeedback = {
  score: number;
  good: string[];
  improve: string[];
};

/**
 * Quick offline check used when the Cursor agent is not available. It looks for
 * the things interviewers actually notice: structure, specifics and length.
 */
export function rubricFeedback(question: string, answer: string): AnswerFeedback {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const good: string[] = [];
  const improve: string[] = [];
  let score = 40;

  if (words.length < 40) {
    improve.push("Too short. Aim for 120-250 words so there is room for a real example.");
    score -= 15;
  } else if (words.length > 400) {
    improve.push("Too long. Cut it to the one example that matters most.");
    score -= 5;
  } else {
    good.push("Good length.");
    score += 10;
  }

  if (/\d/.test(answer)) {
    good.push("You used numbers. That makes it believable.");
    score += 15;
  } else {
    improve.push("Add one number: time saved, users, latency, team size, money.");
  }

  const starHits = [
    /\b(situation|when i was|at my last|in my previous|we had)\b/i,
    /\b(task|my job was|i was asked|goal was)\b/i,
    /\b(i built|i wrote|i changed|i led|i fixed|i decided|i set up)\b/i,
    /\b(result|so that|which meant|after that|reduced|increased|improved|saved)\b/i,
  ].filter((re) => re.test(answer)).length;
  if (starHits >= 3) {
    good.push("Clear story: what happened, what you did, how it ended.");
    score += 20;
  } else {
    improve.push("Use a simple shape: what was going on, what you did, what changed.");
  }

  if (/\bwe\b/i.test(answer) && !/\bi\b/i.test(answer)) {
    improve.push("You only said 'we'. Say what you did yourself.");
    score -= 10;
  }

  if (/ctc|salary|notice/i.test(question) && !/\d/.test(answer)) {
    improve.push("Give an actual number for this one.");
  }

  return { score: Math.max(0, Math.min(100, score)), good, improve };
}
