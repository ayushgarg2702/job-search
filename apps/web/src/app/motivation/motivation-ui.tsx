"use client";

import { Check } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { addWin, checkIn } from "@/app/actions/learn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const HOLD_MS = 1200;

/** Press and hold so it's a small deliberate act, not a click. */
export function CheckInButton({ checkedToday }: { checkedToday: boolean }) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(checkedToday);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!holding || done) return;
    const started = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const p = Math.min(1, (now - started) / HOLD_MS);
      setProgress(p);
      if (p < 1) {
        frame = requestAnimationFrame(step);
        return;
      }
      setDone(true);
      setHolding(false);
      startTransition(async () => {
        const res = await checkIn();
        if (res.ok) toast.success(res.message);
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [holding, done]);

  const begin = () => {
    if (!done) setHolding(true);
  };
  const end = () => {
    setHolding(false);
    if (!done) setProgress(0);
  };

  return (
    <button
      type="button"
      onPointerDown={begin}
      onPointerUp={end}
      onPointerLeave={end}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) begin();
      }}
      onKeyUp={end}
      className={cn(
        "relative isolate overflow-hidden rounded-2xl px-8 py-5 font-display text-xl font-bold transition-transform select-none",
        done ? "bg-leaf text-white" : "bg-marigold text-ink active:scale-[0.98]",
        !done && progress === 0 && "animate-pulse-ring",
      )}
    >
      <span aria-hidden className="absolute inset-y-0 left-0 -z-10 bg-white/35" style={{ width: `${progress * 100}%` }} />
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
