import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";

/** Newer installs ship `agent`; older ones ship `cursor-agent`. The installer puts both in ~/.local/bin. */
const LOCAL_BIN = path.join(homedir(), ".local", "bin");
const CANDIDATES = ["agent", "cursor-agent", path.join(LOCAL_BIN, "agent"), path.join(LOCAL_BIN, "cursor-agent")];

let cachedBin: string | null | undefined;

export function findCursorBin(): string | null {
  if (cachedBin !== undefined) return cachedBin;
  const override = process.env.CURSOR_AGENT_BIN;
  const list = override ? [override, ...CANDIDATES] : CANDIDATES;
  for (const bin of list) {
    const res = spawnSync(bin, ["--version"], { encoding: "utf8", timeout: 5000 });
    if (res.status === 0) {
      cachedBin = bin;
      return bin;
    }
  }
  cachedBin = null;
  return null;
}

export type CursorStatus = {
  installed: boolean;
  bin: string | null;
  version: string | null;
  loggedIn: boolean | null;
  detail: string;
};

let statusCache: { at: number; value: CursorStatus } | null = null;

/** Cached for a minute so the draft queue doesn't shell out on every job. */
export function cursorReady(): CursorStatus {
  if (statusCache && Date.now() - statusCache.at < 60_000) return statusCache.value;
  const value = cursorStatus();
  statusCache = { at: Date.now(), value };
  return value;
}

export function cursorStatus(): CursorStatus {
  cachedBin = undefined;
  const bin = findCursorBin();
  if (!bin) {
    return {
      installed: false,
      bin: null,
      version: null,
      loggedIn: null,
      detail: "Cursor CLI not found. Install it with: curl https://cursor.com/install -fsS | bash, then run: agent login",
    };
  }
  const version = spawnSync(bin, ["--version"], { encoding: "utf8" }).stdout.trim();
  const st = spawnSync(bin, ["status"], { encoding: "utf8", timeout: 10000 });
  const out = `${st.stdout}\n${st.stderr}`;
  const loggedIn = st.status === 0 && !/not (logged|authenticated)/i.test(out);
  return {
    installed: true,
    bin,
    version,
    loggedIn,
    detail: loggedIn ? "Signed in. Drafts use your Cursor account." : "Run `agent login` once in a terminal.",
  };
}

export type CursorRunOptions = { model?: string; timeoutMs?: number };

/**
 * Runs one headless Cursor Agent turn and returns its final text.
 * It runs in an empty temp folder without --force, so it cannot touch your files.
 */
export function runCursor(prompt: string, opts: CursorRunOptions = {}): Promise<string> {
  const bin = findCursorBin();
  if (!bin) return Promise.reject(new Error("Cursor CLI not installed"));
  const cwd = mkdtempSync(path.join(tmpdir(), "career-os-agent-"));
  const args = ["-p", "--output-format", "json"];
  if (opts.model) args.push("--model", opts.model);
  args.push(prompt);

  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { cwd, env: process.env });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Cursor agent timed out"));
    }, opts.timeoutMs ?? 180_000);
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      rmSync(cwd, { recursive: true, force: true });
      if (code !== 0) return reject(new Error(stderr.trim() || `Cursor agent exited with ${code}`));
      try {
        const parsed = JSON.parse(stdout);
        resolve(typeof parsed.result === "string" ? parsed.result : stdout);
      } catch {
        resolve(stdout);
      }
    });
  });
}

/** Pulls the first JSON object out of a model reply (it sometimes wraps it in a code fence). */
export function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in agent reply");
  return JSON.parse(body.slice(start, end + 1)) as T;
}
