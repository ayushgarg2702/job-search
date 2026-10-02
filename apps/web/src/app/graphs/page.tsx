import { PageHeader } from "@/components/page-header";
import { SOURCE_NAME } from "@/components/score-badge";
import { db } from "@/lib/db";
import { funnel, outcomeByCity, sentBy, weeklySent } from "@/lib/metrics";
import { CityChart, FunnelChart, SimpleBars, WeeklyChart } from "./charts";

function Panel({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 animate-rise">
      <div>
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
        <p className="text-sm text-muted-foreground">{lead}</p>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">{children}</p>;
}

export default function GraphsPage() {
  const f = funnel();
  const weekly = weeklySent(8);
  const target = (db().prepare("SELECT goal_value FROM targets WHERE metric = 'applications_week'").get() as { goal_value: number } | undefined)?.goal_value ?? null;
  const cities = outcomeByCity();
  const sources = sentBy("source").map((r) => ({ key: SOURCE_NAME[r.key] ?? r.key, n: r.n }));
  const companies = sentBy("company", 8);
  const sent = f.find((s) => s.stage === "Approved")?.count ?? 0;
  const interviews = f.find((s) => s.stage === "Interviews")?.count ?? 0;

  return (
    <>
      <PageHeader title="Where you're sending" lead="Every job the app found, every one you approved, and where it went." />

      <div className="mb-10 flex flex-wrap gap-x-12 gap-y-4 animate-rise">
        <div>
          <p className="font-display text-4xl font-bold text-ink">{sent}</p>
          <p className="text-sm text-muted-foreground">applications approved</p>
        </div>
        <div>
          <p className="font-display text-4xl font-bold text-ink">{interviews}</p>
          <p className="text-sm text-muted-foreground">interviews</p>
        </div>
        <div>
          <p className="font-display text-4xl font-bold text-ink">{sent ? `${Math.round((interviews / sent) * 100)}%` : "–"}</p>
          <p className="text-sm text-muted-foreground">reply rate to interview</p>
        </div>
      </div>

      <div className="grid gap-12 lg:grid-cols-2">
        <Panel title="Funnel" lead="From found to offer.">
          <FunnelChart data={f} />
        </Panel>
        <Panel title="Each week" lead="Submitted applications against your weekly target.">
          <WeeklyChart data={weekly} target={target} />
        </Panel>
        <Panel title="By city" lead="Where you applied, and where interviews came from.">
          {cities.length ? <CityChart data={cities} /> : <Empty>Approve a few jobs to see cities here.</Empty>}
        </Panel>
        <Panel title="By board" lead="Which job boards your applications came from.">
          {sources.length ? <SimpleBars data={sources} label="Applications" /> : <Empty>No applications yet.</Empty>}
        </Panel>
        <Panel title="Companies" lead="Where you've applied most.">
          {companies.length ? <SimpleBars data={companies} label="Applications" /> : <Empty>No applications yet.</Empty>}
        </Panel>
      </div>
    </>
  );
}
