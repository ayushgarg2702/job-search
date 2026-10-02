"use client";

import { INDIA_CITIES, type SearchConfig } from "@career-os/shared";
import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateSearchConfig } from "@/app/actions/search";
import { TagInput } from "@/components/tag-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Source = { id: string; label: string; via: string };

export function SearchForm({ config, sources, jobspyUp }: { config: SearchConfig; sources: Source[]; jobspyUp: boolean }) {
  const [cfg, setCfg] = useState(config);
  const [company, setCompany] = useState({ provider: "greenhouse" as "greenhouse" | "lever" | "ashby", slug: "" });
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof SearchConfig>(k: K, v: SearchConfig[K]) => setCfg((c) => ({ ...c, [k]: v }));

  const save = () =>
    startTransition(async () => {
      const res = await updateSearchConfig(cfg);
      if (res.ok) toast.success("Search settings saved.");
      else toast.error(res.error);
    });

  return (
    <form
      className="space-y-8 animate-rise"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-ink">Boards</h2>
        <ul className="divide-y rounded-xl border bg-card">
          {sources.map((s) => {
            const on = cfg.sources.includes(s.id);
            const needsWorker = s.via === "jobspy";
            return (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <Checkbox
                  id={`src-${s.id}`}
                  checked={on}
                  onCheckedChange={(checked) =>
                    set("sources", checked ? [...cfg.sources, s.id] : cfg.sources.filter((x) => x !== s.id))
                  }
                />
                <Label htmlFor={`src-${s.id}`} className="flex-1 cursor-pointer font-medium">
                  {s.label}
                </Label>
                <span className="text-xs text-muted-foreground">
                  {needsWorker ? (
                    jobspyUp ? (
                      <span className="text-leaf">JobSpy worker running</span>
                    ) : (
                      <span className="text-marigold">Start: pnpm worker:jobspy</span>
                    )
                  ) : (
                    "Direct"
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid gap-5">
        <h2 className="text-xl font-semibold text-ink">What to search</h2>
        <div className="grid gap-1.5">
          <Label>Search terms</Label>
          <TagInput value={cfg.searchTerms} onChange={(v) => set("searchTerms", v)} placeholder="backend engineer, python developer" />
        </div>
        <div className="grid gap-1.5">
          <Label>Locations</Label>
          <TagInput
            value={cfg.locations}
            onChange={(v) => set("locations", v)}
            suggestions={[...INDIA_CITIES.filter((c) => c !== "Remote (India)"), "Remote"]}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label>Posted in the last (hours)</Label>
            <Input type="number" min={1} value={cfg.hoursOld} onChange={(e) => set("hoursOld", Number(e.target.value))} />
          </div>
          <div className="grid gap-1.5">
            <Label>Results per board</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={cfg.resultsPerSource}
              onChange={(e) => set("resultsPerSource", Number(e.target.value))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Search automatically every (hours)</Label>
            <Input
              type="number"
              min={0}
              value={cfg.autoFetchHours}
              onChange={(e) => set("autoFetchHours", Number(e.target.value))}
            />
            <span className="text-xs text-muted-foreground">0 = only when you press Search now</span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-ink">Company career pages</h2>
        <p className="text-sm text-muted-foreground">
          Companies that post on Greenhouse, Lever or Ashby. Only roles in India that match your search terms are kept. The
          slug is the part of their jobs URL, like <code className="font-mono">jobs.lever.co/meesho</code>.
        </p>
        <ul className="flex flex-wrap gap-2">
          {cfg.atsCompanies.map((c) => (
            <li
              key={`${c.provider}-${c.slug}`}
              className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm"
            >
              <span className="font-medium">{c.slug}</span>
              <span className="text-xs text-muted-foreground">{c.provider}</span>
              <button
                type="button"
                aria-label={`Remove ${c.slug}`}
                className="text-muted-foreground hover:text-destructive"
                onClick={() => set("atsCompanies", cfg.atsCompanies.filter((x) => x !== c))}
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <select
            value={company.provider}
            onChange={(e) => setCompany({ ...company, provider: e.target.value as typeof company.provider })}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="greenhouse">Greenhouse</option>
            <option value="lever">Lever</option>
            <option value="ashby">Ashby</option>
          </select>
          <Input
            value={company.slug}
            onChange={(e) => setCompany({ ...company, slug: e.target.value.trim().toLowerCase() })}
            placeholder="company slug"
            className="w-44"
          />
          <Button
            type="button"
            variant="outline"
            disabled={!company.slug}
            onClick={() => {
              set("atsCompanies", [...cfg.atsCompanies, company]);
              setCompany({ ...company, slug: "" });
            }}
          >
            <Plus /> Add
          </Button>
        </div>
      </section>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Save search settings"}
      </Button>
    </form>
  );
}
