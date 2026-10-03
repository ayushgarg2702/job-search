import type { Page } from "playwright";
import { getContext } from "./context";

export type NaukriJob = {
  source: "naukri";
  externalId: string | null;
  title: string;
  company: string;
  location: string;
  url: string;
  applyUrl: string | null;
  description: string;
  salaryMinInr: number | null;
  salaryMaxInr: number | null;
  isRemote: boolean;
  postedAt: string | null;
};

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function naukriSearchUrl(term: string, location: string) {
  const t = slug(term) || "software-engineer";
  let loc = slug(location);
  if (!loc || loc === "remote" || loc === "india") {
    return `https://www.naukri.com/${t}-jobs`;
  }
  // Naukri still indexes Bengaluru as bangalore in many URLs
  if (loc === "bengaluru" || loc === "bengalooru") loc = "bangalore";
  return `https://www.naukri.com/${t}-jobs-in-${loc}`;
}

async function looksLikeCaptcha(page: Page): Promise<boolean> {
  const text = ((await page.locator("body").innerText().catch(() => "")) || "").toLowerCase();
  if (/captcha|verify you are human|unusual traffic|access denied|robot/.test(text)) return true;
  const frames = page.frames().some((f) => /recaptcha|hcaptcha|captcha/i.test(f.url()));
  return frames;
}

/** Opens Naukri in the helper browser so you can solve captcha / log in once. Session is saved. */
export async function unlockNaukri(): Promise<{ ok: true; message: string }> {
  const ctx = await getContext();
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.bringToFront().catch(() => {});
  await page.goto("https://www.naukri.com/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  return {
    ok: true,
    message:
      "Helper browser opened Naukri. Solve any captcha or log in there (once is usually enough). Then press Search now — Naukri will use that same browser.",
  };
}

/**
 * Scrapes Naukri job cards with the shared Chromium profile (cookies / captcha from unlock).
 */
export async function searchNaukri(input: {
  search_term: string;
  location?: string;
  results_wanted?: number;
}): Promise<{ jobs: NaukriJob[]; error?: string }> {
  const limit = Math.min(50, Math.max(5, input.results_wanted ?? 20));
  const location = input.location || "Bengaluru";
  const url = naukriSearchUrl(input.search_term, location);

  try {
    const ctx = await getContext();
    const page = ctx.pages().find((p) => /naukri\.com/i.test(p.url())) ?? ctx.pages()[0] ?? (await ctx.newPage());
    await page.bringToFront().catch(() => {});
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(2500);

    if (await looksLikeCaptcha(page)) {
      return {
        jobs: [],
        error:
          "Naukri is showing a captcha. Click “Unlock Naukri” on Job boards, solve it in the helper browser, then search again.",
      };
    }

    // Wait for common card selectors; Naukri changes class names often.
    await page
      .waitForSelector("article, .srp-jobtuple-wrapper, .jobTuple, a[href*='/job-listings'], a[href*='job-listing']", {
        timeout: 12_000,
      })
      .catch(() => {});

    const raw = await page.evaluate((max) => {
      const out: { title: string; company: string; location: string; url: string; externalId: string | null }[] = [];
      const seen = new Set<string>();

      const cards = Array.from(
        document.querySelectorAll("article, .srp-jobtuple-wrapper, .jobTuple, div[data-job-id], .cust-job-tuple"),
      );
      const pickFromCards = cards.length > 0;

      const nodes = pickFromCards
        ? cards
        : Array.from(document.querySelectorAll("a[href*='/job-listings'], a[href*='job-listing']"));

      for (const node of nodes) {
        if (out.length >= max) break;
        const root = node as HTMLElement;
        const link =
          (root.matches?.("a") ? (root as HTMLAnchorElement) : root.querySelector("a[href*='job']")) as
            | HTMLAnchorElement
            | null;
        const href = link?.href || "";
        if (!href || !/naukri\.com/i.test(href)) continue;
        if (!/job-listing/i.test(href) && !/jobdescription/i.test(href) && !/\/job\//i.test(href)) continue;
        const clean = href.split("?")[0];
        if (seen.has(clean)) continue;
        seen.add(clean);

        const title =
          (
            root.querySelector("a.title, .title, .jobTitle, .job-title, a[class*='title']")?.textContent ||
            link?.textContent ||
            ""
          )
            .replace(/\s+/g, " ")
            .trim() || "Untitled";
        const company = (
          root.querySelector(".comp-name, .companyInfo a, .company-name, a[class*='comp'], span[class*='comp']")
            ?.textContent || ""
        )
          .replace(/\s+/g, " ")
          .trim();
        const location = (
          root.querySelector(".locWdth, .location, span[class*='loc'], .job-location")?.textContent || ""
        )
          .replace(/\s+/g, " ")
          .trim();
        const idMatch = clean.match(/(\d{6,})/);
        out.push({
          title,
          company: company || "Unknown",
          location,
          url: clean,
          externalId: idMatch?.[1] ?? null,
        });
      }
      return out;
    }, limit);

    if (raw.length === 0) {
      const captcha = await looksLikeCaptcha(page);
      return {
        jobs: [],
        error: captcha
          ? "Naukri is showing a captcha. Click “Unlock Naukri”, solve it once, then search again."
          : "Opened Naukri but found no job cards. Unlock/login in the helper browser, then try again.",
      };
    }

    return {
      jobs: raw.map((j) => ({
        source: "naukri" as const,
        externalId: j.externalId,
        title: j.title,
        company: j.company,
        location: j.location,
        url: j.url,
        applyUrl: j.url,
        description: "",
        salaryMinInr: null,
        salaryMaxInr: null,
        isRemote: /remote|work from home|wfh/i.test(j.location),
        postedAt: null,
      })),
    };
  } catch (err) {
    return { jobs: [], error: `Naukri browser search failed: ${(err as Error).message.slice(0, 160)}` };
  }
}
