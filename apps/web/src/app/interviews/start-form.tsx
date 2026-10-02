"use client";

import { useState, useTransition } from "react";
import type { QuestionTrack } from "@career-os/engine";
import { startMock } from "@/app/actions/interviews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StartMockForm({
  tracks,
  roles,
  defaultTrack,
}: {
  tracks: { id: QuestionTrack; label: string }[];
  roles: string[];
  defaultTrack: QuestionTrack;
}) {
  const [track, setTrack] = useState<QuestionTrack>(defaultTrack);
  const [role, setRole] = useState(roles[0] ?? "");
  const [count, setCount] = useState(5);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(() => startMock({ track, role, count }));
      }}
    >
      <div className="grid gap-1.5">
        <Label>Round</Label>
        <select
          value={track}
          onChange={(e) => setTrack(e.target.value as QuestionTrack)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label>Role you&apos;re practising for</Label>
        <Input list="mock-roles" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Backend Engineer at Groww" />
        <datalist id="mock-roles">
          {roles.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </div>
      <div className="grid gap-1.5">
        <Label>Questions</Label>
        <div className="flex gap-1.5">
          {[3, 5, 8].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCount(n)}
              className={`rounded-lg border px-3 py-1 font-mono text-sm ${count === n ? "border-ink bg-ink text-primary-foreground" : "hover:border-ink/50"}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Setting up…" : "Start interview"}
      </Button>
    </form>
  );
}
