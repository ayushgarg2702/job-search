"use client";

import {
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Flag,
  Inbox,
  Map,
  Menu,
  MessagesSquare,
  Plug,
  Settings,
  Sun,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const GROUPS = [
  {
    label: "Job search",
    items: [
      { href: "/", label: "Today", icon: Sun },
      { href: "/inbox", label: "Inbox", icon: Inbox, badge: true },
      { href: "/applications", label: "Applications", icon: BriefcaseBusiness },
      { href: "/graphs", label: "Graphs", icon: BarChart3 },
    ],
  },
  {
    label: "You",
    items: [
      { href: "/profile", label: "Resume", icon: UserRound },
      { href: "/goals", label: "Goals & targets", icon: Flag },
      { href: "/learn", label: "Learn", icon: BookOpen },
      { href: "/roadmap", label: "Roadmap", icon: Map },
      { href: "/interviews", label: "Interviews", icon: MessagesSquare },
      { href: "/motivation", label: "Motivation", icon: Trophy },
    ],
  },
  {
    label: "Setup",
    items: [
      { href: "/connections", label: "Job boards", icon: Plug },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function NavLinks({ inboxCount, mobile = false }: { inboxCount: number; mobile?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const list = (
    <nav className="flex flex-col gap-6 px-3">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-[0.7rem] font-semibold tracking-[0.14em] text-sidebar-foreground/50 uppercase">
            {group.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map(({ href, label, icon: Icon, badge }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className={cn("size-4", active && "text-marigold")} />
                    {label}
                    {badge && inboxCount > 0 && (
                      <span className="ml-auto rounded-md bg-marigold px-1.5 py-0.5 text-[0.7rem] font-bold text-ink">
                        {inboxCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  if (!mobile) return list;

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="rounded-lg p-2 hover:bg-sidebar-accent"
      >
        <Menu className="size-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-sidebar pb-10 text-sidebar-foreground animate-in fade-in-0">
          <div className="flex justify-end p-3">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 hover:bg-sidebar-accent"
            >
              <X className="size-5" />
            </button>
          </div>
          {list}
        </div>
      )}
    </>
  );
}
