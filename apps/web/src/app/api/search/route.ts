import { runFetch } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

/** Same as "Search now". Handy for a cron job: curl -X POST http://127.0.0.1:43123/api/search */
export async function POST(req: Request) {
  const host = new URL(req.url).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") return new Response("forbidden", { status: 403 });
  return Response.json(await runFetch());
}
