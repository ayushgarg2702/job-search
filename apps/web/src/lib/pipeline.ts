import "server-only";
import { runDraftPipeline } from "@career-os/agents";
import { scoreJob } from "@career-os/engine";
import type { NormalizedJob } from "@career-os/shared";
import { db } from "./db";
import { fetchAts, fetchInstahyre, fetchJobSpy, type FetchResult } from "./fetchers";
import { getJob, insertJobs, listJobs, saveDraft, saveEvaluation, setStatus } from "./jobs";
import { getProfile, getSearchConfig, getSettings, hasResume } from "./store";

type State = { fetching: boolean; queue: number[]; drafting: number | null; booted: boolean };
const g = globalThis as unknown as { __careerPipeline?: State };
const state: State = (g.__careerPipeline ??= { fetching: false, queue: [], drafting: null, booted: false });

function boot() {
  if (state.booted) return;
  state.booted = true;
  db().prepare("UPDATE jobs SET status = 'scored' WHERE status = 'drafting'").run();
}

export function pipelineState() {
  boot();
  return { fetching: state.fetching, queued: state.queue.length, drafting: state.drafting };
}

export type FetchSummary = { found: number; added: number; log: { source: string; found: number; error?: string }[] };

export async function runFetch(): Promise<FetchSummary> {
  boot();
  if (state.fetching) return { found: 0, added: 0, log: [{ source: "all", found: 0, error: "A search is already running." }] };
  state.fetching = true;
  const run = db().prepare("INSERT INTO fetch_runs DEFAULT VALUES").run();
  try {
    const cfg = getSearchConfig();
    const settings = getSettings();
    const results: FetchResult[] = [];
    const jobspySites = cfg.sources.filter((s) => ["naukri", "indeed", "linkedin"].includes(s));

    for (const term of cfg.searchTerms) {
      for (const loc of cfg.locations) {
        results.push(...(await fetchJobSpy(settings.jobspyUrl, jobspySites, term, loc, cfg)));
      }
      if (cfg.sources.includes("instahyre")) results.push(await fetchInstahyre(term, cfg.resultsPerSource));
    }
    if (cfg.sources.includes("ats")) results.push(await fetchAts(cfg));

    const all: NormalizedJob[] = results.flatMap((r) => r.jobs);
    const added = insertJobs(all);
    scoreJobs(added);

    const merged = new Map<string, { source: string; found: number; error?: string }>();
    for (const r of results) {
      const m = merged.get(r.source) ?? { source: r.source, found: 0 };
      m.found += r.jobs.length;
      if (r.error) m.error = r.error;
      merged.set(r.source, m);
    }
    const summary = { found: all.length, added: added.length, log: [...merged.values()] };
    db()
      .prepare("UPDATE fetch_runs SET finished_at = datetime('now'), found = ?, added = ?, log = ? WHERE id = ?")
      .run(summary.found, summary.added, JSON.stringify(summary.log), run.lastInsertRowid);
    return summary;
  } finally {
    state.fetching = false;
  }
}

export function scoreJobs(ids: number[]) {
  const profile = getProfile();
  const settings = getSettings();
  for (const id of ids) {
    const job = getJob(id);
    if (!job) continue;
    const evaluation = scoreJob(profile, {
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      salaryMaxInr: job.salary_max,
      isRemote: job.isRemote,
    });
    saveEvaluation(id, evaluation);
    if (job.status === "discovered") setStatus(id, "scored", `Fit ${evaluation.score}/100`);
    if (settings.autoDraft && hasResume() && evaluation.score >= settings.draftThreshold && evaluation.blockers.length === 0) {
      queueDraft(id);
    }
  }
}

/** Re-score everything still waiting on you, e.g. after the profile changes. */
export function rescoreOpen() {
  const open = listJobs(["discovered", "scored"]).map((j) => j.id);
  scoreJobs(open);
}

export function queueDraft(jobId: number) {
  boot();
  if (state.queue.includes(jobId) || state.drafting === jobId) return;
  state.queue.push(jobId);
  setStatus(jobId, "drafting");
  void drainQueue();
}

async function drainQueue() {
  if (state.drafting !== null) return;
  const next = state.queue.shift();
  if (next === undefined) return;
  state.drafting = next;
  try {
    const job = getJob(next);
    if (job) {
      const result = await runDraftPipeline(
        getProfile(),
        { title: job.title, company: job.company, location: job.location, description: job.description },
        { model: getSettings().cursorModel || undefined },
      );
      saveDraft(next, {
        pack: result.pack,
        source: result.source,
        steps: result.steps,
        voice: result.voiceHits,
        provenance: result.provenance,
      });
      setStatus(next, "draft_ready", result.source === "cursor" ? "Written by Cursor agent" : "Offline draft");
      setStatus(next, "awaiting_approval");
    }
  } catch (err) {
    setStatus(next, "scored", `Draft failed: ${(err as Error).message.slice(0, 120)}`);
  } finally {
    state.drafting = null;
    void drainQueue();
  }
}
