import type { GapCount, LearningDraftItem, RoadmapDraftItem } from "@career-os/engine";
import { buildLearningFromGaps, buildRoadmap, mergeResources, type LearnResource } from "@career-os/engine";
import { cursorReady, extractJson, runCursor } from "./cursor";

export type LearnPlan = {
  source: "cursor" | "gaps";
  learning: LearningDraftItem[];
  roadmap: RoadmapDraftItem[];
};

function sanitizeResources(skill: string, raw: unknown): LearnResource[] {
  const list = Array.isArray(raw) ? raw : [];
  const extra: LearnResource[] = [];
  for (const r of list) {
    if (!r || typeof r !== "object") continue;
    const url = String((r as LearnResource).url ?? "").trim();
    if (!url.startsWith("http")) continue;
    const kindRaw = String((r as LearnResource).kind ?? "docs");
    const kind = (["video", "course", "docs", "practice"].includes(kindRaw) ? kindRaw : "docs") as LearnResource["kind"];
    extra.push({
      label: String((r as LearnResource).label ?? url).trim() || url,
      url,
      kind,
    });
  }
  return mergeResources(skill, extra);
}

/**
 * Builds a learning list + roadmap from the user's target role and real skill gaps.
 * Every learning item includes concrete video / docs / practice URLs.
 */
export async function generateLearnPlan(input: {
  targetTitles: string[];
  skills: string[];
  gaps: GapCount[];
  goal?: string;
  model?: string;
}): Promise<LearnPlan> {
  const goal = input.goal || input.targetTitles[0] || "Land a matching role";
  const offline: LearnPlan = {
    source: "gaps",
    learning: buildLearningFromGaps(input.gaps, input.targetTitles),
    roadmap: buildRoadmap(goal, input.gaps),
  };

  const cursor = cursorReady();
  if (!cursor.installed || cursor.loggedIn === false) return offline;
  if (input.gaps.length === 0 && input.targetTitles.length === 0) return offline;

  const prompt = `You are a career coach for an Indian software job search. Do not use tools. Reply with JSON only.

Target roles: ${input.targetTitles.join(", ") || "not set"}
Skills already on resume: ${input.skills.slice(0, 40).join(", ") || "none listed"}
Skill gaps from real job postings (skill: job count): ${
    input.gaps.length
      ? input.gaps
          .slice(0, 12)
          .map((g) => `${g.skill} (${g.jobs})`)
          .join("; ")
      : "none yet — invent a short plan from the target roles only"
  }
Goal: ${goal}

Return JSON:
{
  "learning": [{
    "skill":"...",
    "title":"...",
    "notes":"...",
    "resources":[{"label":"...","url":"https://...","kind":"video|course|docs|practice"}]
  }],
  "roadmap": [{"phase":1,"phaseTitle":"...","title":"...","detail":"..."}]
}

Rules:
- learning: 4-8 items, grounded in the gaps / target role.
- Each learning item MUST include 2-4 resources with real https URLs (YouTube videos, official docs, free courses, practice sites like LeetCode/Exercism/SQLBolt).
- Prefer well-known free sources. No paid-only links. No made-up domains.
- roadmap: 6-10 steps across phases 1-4.
- notes/detail must mention why it matters for the target role or the job counts.`;

  try {
    const raw = await runCursor(prompt, { model: input.model, timeoutMs: 120_000 });
    const parsed = extractJson<{
      learning?: Array<LearningDraftItem & { resources?: LearnResource[] }>;
      roadmap?: RoadmapDraftItem[];
    }>(raw);
    const learning = (parsed.learning ?? [])
      .filter((l) => l.skill?.trim() && l.title?.trim())
      .slice(0, 10)
      .map((l) => ({
        skill: l.skill.trim(),
        title: l.title.trim(),
        notes: (l.notes ?? "").trim(),
        resources: sanitizeResources(l.skill.trim(), l.resources),
      }));
    const roadmap = (parsed.roadmap ?? [])
      .filter((r) => r.title?.trim())
      .slice(0, 12)
      .map((r, i) => ({
        phase: Math.min(4, Math.max(1, Number(r.phase) || Math.floor(i / 3) + 1)),
        phaseTitle: (r.phaseTitle || `Phase ${r.phase || 1}`).trim(),
        title: r.title.trim(),
        detail: (r.detail ?? "").trim(),
      }));
    if (!learning.length && !roadmap.length) return offline;
    return {
      source: "cursor",
      learning: learning.length ? learning : offline.learning,
      roadmap: roadmap.length ? roadmap : offline.roadmap,
    };
  } catch {
    return offline;
  }
}
