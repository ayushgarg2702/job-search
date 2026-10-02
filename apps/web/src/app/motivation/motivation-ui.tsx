"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { addWin, checkIn } from "@/app/actions/learn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const HOLD_MS = 1200;

/** Press and hold so it's a small deliberate act, not a click. */
export function CheckInButton({ checkedToday }: { checkedToday: boolean }) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(checkedToday);
  const [, startTransition] = useTransition();
  const raf = useRef<number | null>(null);
  const start = useRef(0);

  const stop = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    if (!done) setProgress(0);
  };

  const tick = () => {
    const p = Math.min(1, (performance.now() - start.current) / HOLD_MS);
    setProgress(p);
    if (p >= 1) {
      raf.current = null;
      setDone(true);
      startTransition(async () => {
        const res = await checkIn();
        if (res.ok) toast.success(res.message);
      });
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <button
      type="button"
      onPointerDown={() => {
        if (done) return;
        start.current = performance.now();
        raf.current = requestAnimationFrame(tick);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !done && !raf.current) {
          start.current = performance.now();
          raf.current = requestAnimationFrame(tick);
        }
      }}
      onKeyUp={stop}
      className={cn(
        "relative isolate overflow-hidden rounded-2xl px-8 py-5 font-display text-xl font-bold transition-transform select-none",
        done ? "bg-leaf text-white" : "bg-marigold text-ink active:scale-[0.98]",
        !done && progress === 0 && "animate-pulse-ring",
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 -z-10 bg-white/35"
        style={{ width: `${progress * 100}%` }}
      />
      {done ? (
        <span className="flex items-center gap-2">
          <Check className="size-6" /> Checked in today
        </span>
      ) : progress > 0 ? (
        "Keep holding…"
      ) : (
        "Hold to say it"
      )}
    </button>
  );
}

export function WinForm() {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await addWin(text);
          if (!res.ok) toast.error(res.error);
          else setText("");
        });
      }}
    >
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Got a callback from Groww" />
      <Button type="submit" disabled={pending || !text.trim()}>
        Add win
      </Button>
    </form>
  );
}
