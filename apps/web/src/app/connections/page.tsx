import { SOURCES } from "@career-os/shared";
import { PageHeader } from "@/components/page-header";
import { ping } from "@/lib/health";
import { pipelineState } from "@/lib/pipeline";
import { recentRuns } from "@/lib/runs";
import { getSearchConfig, getSettings } from "@/lib/store";
import { RunLog, SearchButton } from "./run-ui";
import { SearchForm } from "./search-form";

export default async function ConnectionsPage() {
  const cfg = getSearchConfig();
  const settings = getSettings();
  const jobspyUp = await ping(settings.jobspyUrl);
  const runs = recentRuns(5);

  return (
    <>
      <PageHeader
        title="Job boards"
        lead="Pick where to look and what to look for. No logins or API keys needed. Results are scored against your resume as they come in."
      >
        <SearchButton initiallyRunning={pipelineState().fetching} />
      </PageHeader>

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
