import { cn } from "@/lib/utils";

export function ProgressLine({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full animate-grow-x", pct >= 100 ? "bg-leaf" : "bg-ink")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
