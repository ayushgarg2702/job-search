import { statusCounts } from "@/lib/jobs";
import { pipelineState } from "@/lib/pipeline";
import { recentRuns } from "@/lib/runs";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ...pipelineState(), counts: statusCounts(), lastRun: recentRuns(1)[0] ?? null });
}
