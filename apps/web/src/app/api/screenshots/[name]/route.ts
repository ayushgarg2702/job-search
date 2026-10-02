import { readFileSync } from "node:fs";
import path from "node:path";
import { DATA_DIR } from "@/lib/db";

export async function GET(_req: Request, ctx: RouteContext<"/api/screenshots/[name]">) {
  const { name } = await ctx.params;
  if (!/^job-\d+-session-\d+\.png$/.test(name)) return new Response("not found", { status: 404 });
  try {
    const buf = readFileSync(path.join(DATA_DIR, "screenshots", name));
    return new Response(buf, { headers: { "content-type": "image/png", "cache-control": "no-store" } });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
