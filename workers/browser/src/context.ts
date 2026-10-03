import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext } from "playwright";

const DATA_DIR = process.env.CAREER_OS_DATA_DIR
  ? path.resolve(process.env.CAREER_OS_DATA_DIR)
  : path.resolve(import.meta.dirname, "../../../data");
const HEADLESS = process.env.CAREER_OS_HEADLESS === "1";

let context: BrowserContext | null = null;

/** Shared Chromium profile — logins and solved captchas stick across unlock / search / apply. */
export async function getContext(): Promise<BrowserContext> {
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

export async function closeContext() {
  await context?.close().catch(() => {});
  context = null;
}
