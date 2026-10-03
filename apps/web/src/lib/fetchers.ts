import "server-only";
import type { NormalizedJob, SearchConfig } from "@career-os/shared";
import { isIndiaLocation } from "@career-os/shared";

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

export type FetchResult = { source: string; jobs: NormalizedJob[]; error?: string };

function stripHtml(html: string): string {
  return html
    .replace(/<\s*(br|\/p|\/li|\/h\d)\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeEntities(s: string) {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "user-agent": UA, accept: "application/json", ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchJobSpy(
  workerUrl: string,
  sites: string[],
  term: string,
  location: string,
  cfg: SearchConfig,
): Promise<FetchResult[]> {
  if (sites.length === 0) return [];
  try {
    const data = await getJson<{ jobs: NormalizedJob[]; errors: string[] }>(`${workerUrl}/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sites,
        search_term: term,
        location: location === "Remote" ? "India" : location,
        results_wanted: cfg.resultsPerSource,
        hours_old: cfg.hoursOld,
      }),
    });
    const bySite = new Map<string, FetchResult>(sites.map((s) => [s, { source: s, jobs: [] }]));
    for (const j of data.jobs) bySite.get(j.source)?.jobs.push(j);
    for (const err of data.errors) {
      const [site, ...rest] = err.split(":");
      const r = bySite.get(site);
      if (r) r.error = rest.join(":").trim();
    }
    return [...bySite.values()];
  } catch (err) {
    const msg = `JobSpy worker not reachable at ${workerUrl} (${(err as Error).message}). Start it with: pnpm worker:jobspy`;
    return sites.map((s) => ({ source: s, jobs: [], error: msg }));
  }
}

/** Naukri via helper browser (shared profile — solve captcha once with Unlock Naukri). */
export async function fetchNaukriBrowser(
  browserWorkerUrl: string,
  term: string,
  location: string,
  cfg: SearchConfig,
): Promise<FetchResult> {
  try {
    const data = await getJson<{ jobs: NormalizedJob[]; error?: string }>(`${browserWorkerUrl}/search/naukri`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        search_term: term,
        location: location === "Remote" ? "India" : location,
        results_wanted: cfg.resultsPerSource,
      }),
    });
    return { source: "naukri", jobs: data.jobs ?? [], error: data.error };
  } catch (err) {
    return {
      source: "naukri",
      jobs: [],
      error: `Browser worker not reachable (${(err as Error).message}). Start it with: pnpm worker:browser, then Unlock Naukri.`,
    };
  }
}

type InstahyreJob = {
  id: number;
  title: string;
  locations: string;
  keywords: string[];
  public_url: string;
  employer: { company_name: string; company_tagline?: string; instahyre_note?: string };
};

export async function fetchInstahyre(term: string, limit: number): Promise<FetchResult> {
  try {
    const params = new URLSearchParams({ skills: term, limit: String(Math.min(limit, 35)), offset: "0" });
    const data = await getJson<{ objects: InstahyreJob[] }>(`https://www.instahyre.com/api/v1/job_search?${params}`);
    return {
      source: "instahyre",
      jobs: data.objects.map((o) => ({
        source: "instahyre",
        externalId: String(o.id),
        title: o.title,
        company: o.employer.company_name,
        location: o.locations,
        url: o.public_url,
        applyUrl: o.public_url,
        description: [
          o.keywords.length ? `Skills: ${o.keywords.join(", ")}` : "",
          o.employer.company_tagline ?? "",
          o.employer.instahyre_note ?? "",
        ]
          .filter(Boolean)
          .join("\n\n"),
        salaryMinInr: null,
        salaryMaxInr: null,
        isRemote: /work from home|remote/i.test(o.locations),
        postedAt: null,
      })),
    };
  } catch (err) {
    return { source: "instahyre", jobs: [], error: (err as Error).message };
  }
}

type GreenhouseJob = { id: number; title: string; absolute_url: string; location: { name: string }; content: string; updated_at: string; company_name?: string };
type LeverJob = { id: string; text: string; hostedUrl: string; applyUrl: string; categories: { location?: string; allLocations?: string[] }; descriptionPlain?: string; lists?: { text: string; content: string }[]; workplaceType?: string; createdAt: number };
type AshbyJob = { id: string; title: string; jobUrl: string; applyUrl: string; location: string; secondaryLocations?: { location: string }[]; descriptionPlain?: string; isRemote?: boolean; publishedAt?: string };

function matchesTerm(title: string, terms: string[]): boolean {
  if (terms.length === 0) return false;
  const tokens = new Set(
    title
      .toLowerCase()
      .replace(/\./g, "")
      .split(/[^a-z0-9+#]+/)
      .filter(Boolean),
  );
  return terms.some((term) => {
    const words = term
      .toLowerCase()
      .replace(/\./g, "")
      .split(/[^a-z0-9+#]+/)
      .filter((w) => w.length > 1 && !["and", "the", "for", "of"].includes(w));
    if (words.length === 0) return false;
    const soft = new Set(["sr", "senior", "jr", "junior", "ii", "iii", "2", "3"]);
    const hard = words.filter((w) => !soft.has(w));
    const check = hard.length ? hard : words;
    const hit = check.filter((w) => tokens.has(w)).length;
    return hit >= Math.ceil(check.length * 0.6);
  });
}

function prettySlug(slug: string) {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

async function fetchAtsCompany(provider: string, slug: string): Promise<NormalizedJob[]> {
  if (provider === "greenhouse") {
    const data = await getJson<{ jobs: GreenhouseJob[] }>(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`);
    return data.jobs.map((j) => ({
      source: "ats",
      externalId: `gh-${j.id}`,
      title: j.title,
      company: j.company_name || prettySlug(slug),
      location: j.location?.name ?? "",
      url: j.absolute_url,
      applyUrl: j.absolute_url,
      description: stripHtml(decodeEntities(j.content ?? "")),
      salaryMinInr: null,
      salaryMaxInr: null,
      isRemote: /remote/i.test(j.location?.name ?? ""),
      postedAt: j.updated_at,
    }));
  }
  if (provider === "lever") {
    const data = await getJson<LeverJob[]>(`https://api.lever.co/v0/postings/${slug}?mode=json`);
    return data.map((j) => ({
      source: "ats",
      externalId: `lv-${j.id}`,
      title: j.text,
      company: prettySlug(slug),
      location: (j.categories.allLocations ?? [j.categories.location ?? ""]).join(", "),
      url: j.hostedUrl,
      applyUrl: j.applyUrl,
      description: [j.descriptionPlain ?? "", ...(j.lists ?? []).map((l) => `${l.text}\n${stripHtml(l.content)}`)].join("\n\n"),
      salaryMinInr: null,
      salaryMaxInr: null,
      isRemote: j.workplaceType === "remote",
      postedAt: new Date(j.createdAt).toISOString(),
    }));
  }
  const data = await getJson<{ jobs: AshbyJob[] }>(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
  return data.jobs.map((j) => ({
    source: "ats",
    externalId: `ab-${j.id}`,
    title: j.title,
    company: prettySlug(slug),
    location: [j.location, ...(j.secondaryLocations ?? []).map((l) => l.location)].join(", "),
    url: j.jobUrl,
    applyUrl: j.applyUrl,
    description: j.descriptionPlain ?? "",
    salaryMinInr: null,
    salaryMaxInr: null,
    isRemote: Boolean(j.isRemote),
    postedAt: j.publishedAt ?? null,
  }));
}

export async function fetchAts(cfg: SearchConfig): Promise<FetchResult> {
  const jobs: NormalizedJob[] = [];
  const errors: string[] = [];
  await Promise.all(
    cfg.atsCompanies.map(async ({ provider, slug }) => {
      try {
        const list = await fetchAtsCompany(provider, slug);
        jobs.push(...list.filter((j) => isIndiaLocation(j.location) && matchesTerm(j.title, cfg.searchTerms)));
      } catch (err) {
        errors.push(`${slug}: ${(err as Error).message}`);
      }
    }),
  );
  return { source: "ats", jobs, error: errors.length ? errors.join("; ") : undefined };
}
