import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { updateSession } from "@/lib/apply";
import { DATA_DIR } from "@/lib/db";
import { getJob, setStatus } from "@/lib/jobs";

const Update = z.object({
  sessionId: z.number(),
  status: z.enum(["opening", "filling", "ready", "failed", "closed"]),
  message: z.string().default(""),
  filled: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  skipped: z.array(z.object({ label: z.string(), reason: z.string() })).optional(),
  screenshotBase64: z.string().optional(),
});

function isLocal(req: Request) {
  const host = new URL(req.url).hostname;
  return host === "127.0.0.1" || host === "localhost";
}

/** Status callbacks from the local browser worker. */
export async function POST(req: Request, ctx: RouteContext<"/api/apply/[id]">) {
  if (!isLocal(req)) return new Response("forbidden", { status: 403 });
  const { id } = await ctx.params;
  const jobId = Number(id);
  const parsed = Update.safeParse(await req.json());
  if (!parsed.success || !getJob(jobId)) return new Response("bad request", { status: 400 });
  const u = parsed.data;

  let screenshot: string | undefined;
  if (u.screenshotBase64) {
    const dir = path.join(DATA_DIR, "screenshots");
    mkdirSync(dir, { recursive: true });
    screenshot = `job-${jobId}-session-${u.sessionId}.png`;
    writeFileSync(path.join(dir, screenshot), Buffer.from(u.screenshotBase64, "base64"));
  }

  updateSession(u.sessionId, {
    status: u.status,
    message: u.message,
    filled: u.filled,
    skipped: u.skipped,
    screenshot,
  });

  if (u.status === "ready") setStatus(jobId, "ready_to_submit", "Form filled, waiting for your Submit");
  if (u.status === "failed") setStatus(jobId, "ready_to_submit", `Autofill stopped: ${u.message.slice(0, 120)}`);
  return Response.json({ ok: true });
}
