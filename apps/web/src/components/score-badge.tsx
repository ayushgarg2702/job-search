import { cn } from "@/lib/utils";

export function ScoreBadge({ score, className }: { score: number | null; className?: string }) {
  const tone =
    score === null ? "bg-muted text-muted-foreground" : score >= 70 ? "bg-leaf/15 text-leaf" : score >= 50 ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground";
  return (
    <span
      title="Fit with your resume, out of 100"
      className={cn("grid size-11 shrink-0 place-items-center rounded-xl font-mono text-base font-bold tabular-nums", tone, className)}
    >
      {score ?? "–"}
    </span>
  );
}

export const SOURCE_NAME: Record<string, string> = {
  naukri: "Naukri",
  instahyre: "Instahyre",
  indeed: "Indeed",
  linkedin: "LinkedIn",
  ats: "Company site",
};
