import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DATA_DIR } from "@/lib/db";

export async function GET(_req: Request, ctx: RouteContext<"/api/resume/[jobId]">) {
  const { jobId } = await ctx.params;
  if (!/^\d+$/.test(jobId)) return new Response("not found", { status: 404 });
  const dir = path.join(DATA_DIR, "drafts", `job-${jobId}`);
  try {
    const file = readdirSync(dir).find((f) => f.endsWith(".pdf"));
    if (!file) throw new Error("none");
    return new Response(readFileSync(path.join(dir, file)), {
      headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${file}"` },
    });
  } catch {
    return new Response("The PDF is made when you approve. Approve first.", { status: 404 });
  }
}
