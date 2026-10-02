import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext, type Frame, type Page } from "playwright";
import { applicationUrl, decide } from "./match";
import type { FieldInfo, Filled, SessionRequest, Skipped } from "./types";

const DATA_DIR = process.env.CAREER_OS_DATA_DIR
  ? path.resolve(process.env.CAREER_OS_DATA_DIR)
  : path.resolve(import.meta.dirname, "../../../data");
const HEADLESS = process.env.CAREER_OS_HEADLESS === "1";

let context: BrowserContext | null = null;

async function getContext(): Promise<BrowserContext> {
  if (context) return context;
  const profileDir = path.join(DATA_DIR, "browser-profile");
  mkdirSync(profileDir, { recursive: true });
  context = await chromium.launchPersistentContext(profileDir, {
    headless: HEADLESS,
    viewport: null,
    args: ["--start-maximized"],
  });
  context.on("close", () => {
    context = null;
  });
  return context;
}

async function renderResumePdf(req: SessionRequest): Promise<string> {
  const dir = path.join(DATA_DIR, "drafts");
  mkdirSync(dir, { recursive: true });
  const safeName = (req.profile.name || "resume").replace(/[^A-Za-z0-9]+/g, "_");
  const file = path.join(dir, `job-${req.jobId}`, `${safeName}_Resume.pdf`);
  mkdirSync(path.dirname(file), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(req.resumeHtml, { waitUntil: "load" });
    await page.pdf({ path: file, format: "A4", printBackground: true });
  } finally {
    await browser.close();
  }
  writeFileSync(path.join(path.dirname(file), "cover-letter.txt"), req.coverLetter);
  return file;
}

/**
 * Runs in the page. Tags every visible field with an id and reads a human label
 * for it. Kept as a plain string because tsx rewrites functions with helpers
 * that don't exist inside the browser.
 */
const COLLECT_FIELDS = `(() => {
  const out = [];
  const els = Array.from(document.querySelectorAll("input, textarea, select"));
  let n = 0;
  const text = (el) => ((el && el.textContent) || "").replace(/\\s+/g, " ").trim();
  for (const el of els) {
    const type = (el.type || el.tagName).toLowerCase();
    if (["hidden", "submit", "button", "image", "reset", "search"].includes(type)) continue;
    const style = getComputedStyle(el);
    const visible = style.display !== "none" && style.visibility !== "hidden" && (el.offsetParent !== null || type === "file");
    if (!visible) continue;
    if (el.getAttribute("role") === "combobox" || el.getAttribute("aria-autocomplete")) continue;
    if (el.value && type !== "file" && el.tagName !== "SELECT" && !["checkbox", "radio"].includes(type)) continue;
    let label = "";
    if (el.id) label = text(document.querySelector('label[for="' + CSS.escape(el.id) + '"]'));
    if (!label) label = text(el.closest("label"));
    if (!label) label = el.getAttribute("aria-label") || "";
    if (!label) {
      const ids = el.getAttribute("aria-labelledby");
      if (ids) label = ids.split(" ").map((id) => text(document.getElementById(id))).join(" ");
    }
    if (!label) {
      let node = el.parentElement;
      for (let i = 0; i < 4 && node && !label; i++) {
        const l = node.querySelector("label, legend, .label, .text, [class*='label'], [class*='question']");
        if (l && !l.contains(el)) label = text(l);
        node = node.parentElement;
      }
    }
    if (!label) label = el.placeholder || el.name || "";
    let group = "";
    if (type === "radio" || type === "checkbox") {
      group = el.name || "";
      const box =
        el.closest(".application-question") || el.closest("fieldset") || el.closest("[role=radiogroup]") ||
        el.closest("[role=group]") || (el.closest("li") && el.closest("li").parentElement && el.closest("li").parentElement.closest("li"));
      const q = box && box.querySelector("legend, .application-label, .text, [class*='question'], [class*='label']");
      if (q && !q.contains(el)) label = text(q);
    }
    const id = "cos-" + (++n);
    el.setAttribute("data-cos-id", id);
    out.push({
      id,
      tag: el.tagName.toLowerCase(),
      type,
      group,
      label: label.replace(/[*✱]/g, "").trim().slice(0, 200),
      required: Boolean(el.required) || el.getAttribute("aria-required") === "true" || /[*✱]/.test(label),
      options: el.tagName === "SELECT" ? Array.from(el.options).map((o) => o.text.trim()) : [],
    });
  }
  return out;
})()`;

async function fillFrame(frame: Frame, req: SessionRequest, resumePdf: string, filled: Filled[], skipped: Skipped[]) {
  let fields: FieldInfo[] = [];
  try {
    fields = (await frame.evaluate(COLLECT_FIELDS)) as FieldInfo[];
  } catch (err) {
    console.error("collect fields failed", (err as Error).message.split("\n")[0]);
    return;
  }
  const seen = new Set<string>();
  let resumeAttached = filled.some((f) => f.value.endsWith(".pdf"));
  for (const f of fields) {
    const d = decide(f, req);
    const loc = frame.locator(`[data-cos-id="${f.id}"]`);
    const label = (f.label || f.type).slice(0, 120);
    try {
      if (d.kind === "skip") {
        const key = f.group ? `group:${f.group}` : `${label}|${d.reason}`;
        const worthShowing = f.required || f.tag !== "input" || Boolean(f.group);
        if (worthShowing && !seen.has(key)) skipped.push({ label, reason: d.reason });
        seen.add(key);
        continue;
      }
      if (d.kind === "file") {
        if (resumeAttached) continue;
        await loc.setInputFiles(resumePdf);
        resumeAttached = true;
        filled.push({ label, value: path.basename(resumePdf) });
        continue;
      }
      if (f.tag === "select") await loc.selectOption({ label: d.value });
      else await loc.fill(d.value);
      filled.push({ label, value: d.value.length > 80 ? `${d.value.slice(0, 80)}…` : d.value });
    } catch (err) {
      skipped.push({ label, reason: `Could not fill (${(err as Error).message.split("\n")[0].slice(0, 80)})` });
    }
  }
}

async function report(req: SessionRequest, body: Record<string, unknown>) {
  try {
    await fetch(req.callbackUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: req.sessionId, ...body }),
    });
  } catch (err) {
    console.error("callback failed", (err as Error).message);
  }
}

const BOARD_SOURCES = new Set(["naukri", "linkedin", "indeed", "instahyre"]);

/**
 * Opens the application, fills what it can, and stops. It never clicks a
 * button: Submit, Apply and Next are always yours.
 */
export async function runSession(req: SessionRequest) {
  let page: Page | null = null;
  try {
    await report(req, { status: "opening", message: "Preparing your tailored resume PDF…" });
    const resumePdf = await renderResumePdf(req);

    const ctx = await getContext();
    page = await ctx.newPage();
    const target = applicationUrl(req.url);
    await report(req, { status: "opening", message: `Opening ${new URL(target).hostname}…` });
    await page.goto(target, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.bringToFront();

    await report(req, { status: "filling", message: "Filling the form…" });
    const filled: Filled[] = [];
    const skipped: Skipped[] = [];
    for (const frame of page.frames()) await fillFrame(frame, req, resumePdf, filled, skipped);

    const shot = await page.screenshot({ fullPage: true }).catch(() => null);
    const screenshotBase64 = shot ? shot.toString("base64") : undefined;

    let message: string;
    if (filled.length > 0) {
      message = `Filled ${filled.length} field${filled.length === 1 ? "" : "s"}. Check the browser window, fill anything left, then press Submit yourself.`;
    } else if (BOARD_SOURCES.has(req.source)) {
      message =
        "Opened the posting. This board applies inside its own site, so log in if asked and press Apply yourself. Your answers are listed here to copy.";
    } else {
      message = "Opened the page but found no form to fill. It may be behind an Apply button or a login. Your answers are listed here to copy.";
    }
    await report(req, { status: "ready", message, filled, skipped, screenshotBase64 });
  } catch (err) {
    await report(req, {
      status: "failed",
      message: `Stopped: ${(err as Error).message.split("\n")[0].slice(0, 200)}. The page is left open so you can finish by hand.`,
    });
  }
}

export async function shutdown() {
  await context?.close().catch(() => {});
}
