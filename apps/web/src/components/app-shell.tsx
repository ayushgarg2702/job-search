import { statusCounts } from "@/lib/jobs";
import { NavLinks } from "./nav-links";

export function AppShell({ children }: { children: React.ReactNode }) {
  const counts = statusCounts();
  const waiting = (counts.awaiting_approval ?? 0) + (counts.ready_to_submit ?? 0);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <Brand />
        <NavLinks inboxCount={waiting} />
        <p className="mt-auto px-6 pb-6 text-xs leading-relaxed text-sidebar-foreground/60">
          Runs on your machine. Nothing is sent without your click.
        </p>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-sidebar px-4 py-3 text-sidebar-foreground lg:hidden">
          <Brand compact />
          <NavLinks inboxCount={waiting} mobile />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "flex items-center gap-2" : "flex items-center gap-3 px-6 pt-7 pb-8"}>
      <span
        aria-hidden
        className="grid size-9 place-items-center rounded-xl bg-marigold font-display text-lg font-extrabold text-ink"
      >
        C
      </span>
      <span className="font-display text-xl font-bold tracking-tight">
        Career<span className="text-marigold">OS</span>
      </span>
    </div>
  );
}
