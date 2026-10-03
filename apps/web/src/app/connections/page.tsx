import { SOURCES } from "@career-os/shared";
import { PageHeader } from "@/components/page-header";
import { ping } from "@/lib/health";
import { pipelineState } from "@/lib/pipeline";
import { recentRuns } from "@/lib/runs";
import { getSearchConfig, getSettings } from "@/lib/store";
import { RunLog, SearchButton, UnlockNaukriButton } from "./run-ui";
import { SearchForm } from "./search-form";

export default async function ConnectionsPage() {
  const cfg = getSearchConfig();
  const settings = getSettings();
  const jobspyUp = await ping(settings.jobspyUrl);
  const browserUp = await ping(settings.browserWorkerUrl);
  const runs = recentRuns(5);
  const naukriOn = cfg.sources.includes("naukri");

  return (
    <>
      <PageHeader
        title="Job boards"
        lead="Pick where to look and what to look for. No API keys needed. Results are scored against your resume as they come in."
      >
        <div className="flex flex-wrap gap-2">
          {naukriOn && <UnlockNaukriButton />}
          <SearchButton initiallyRunning={pipelineState().fetching} />
        </div>
      </PageHeader>

      {naukriOn && (
        <p className="mb-8 max-w-2xl text-sm text-muted-foreground animate-rise">
          Naukri often asks for a captcha. Press <span className="font-medium text-foreground">Unlock Naukri</span> once,
          solve it (or log in) in the helper browser, then <span className="font-medium text-foreground">Search now</span>.
          That session is saved — you usually only need to do this once or twice.
          {!browserUp && (
            <span className="mt-1 block text-marigold">Browser worker is down. Start it with: pnpm worker:browser</span>
          )}
        </p>
      )}

      <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
        <SearchForm
          config={cfg}
          sources={SOURCES.map((s) => ({ id: s.id, label: s.label, via: s.via }))}
          jobspyUp={jobspyUp}
        />
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-ink">Recent searches</h2>
          <RunLog runs={runs} />
        </section>
      </div>
    </>
  );
}
