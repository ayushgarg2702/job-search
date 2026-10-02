import { pipelineState, runFetch } from "./pipeline";
import { lastRunAt } from "./runs";
import { getSearchConfig } from "./store";

const g = globalThis as unknown as { __careerScheduler?: NodeJS.Timeout };

/** Checks every 10 minutes whether an automatic search is due. Only runs while the app is open. */
export function startScheduler() {
  if (g.__careerScheduler) return;
  g.__careerScheduler = setInterval(() => {
    try {
      const { autoFetchHours } = getSearchConfig();
      if (!autoFetchHours || pipelineState().fetching) return;
      const last = lastRunAt();
      if (!last || Date.now() - last.getTime() >= autoFetchHours * 3_600_000) void runFetch();
    } catch (err) {
      console.error("scheduler", err);
    }
  }, 10 * 60_000);
}
