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
  jobs,
  defaultTrack,
  defaultRole,
}: {
  tracks: { id: QuestionTrack; label: string }[];
  roles: string[];
  jobs: { id: number; label: string }[];
  defaultTrack: QuestionTrack;
  defaultRole: string;
}) {
  const [track, setTrack] = useState<QuestionTrack>(defaultTrack);
  const [role, setRole] = useState(defaultRole || roles[0] || "");
  const [jobId, setJobId] = useState<string>("");
  const [count, setCount] = useState(5);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(() =>
          startMock({ track, role, count, jobId: jobId ? Number(jobId) : null }),
        );
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
        <Input list="mock-roles" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Sr. SDE" />
        <datalist id="mock-roles">
          {roles.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </div>
      {jobs.length > 0 && (
        <div className="grid gap-1.5">
          <Label>Optional: base on a specific job</Label>
          <select
            value={jobId}
            onChange={(e) => {
              setJobId(e.target.value);
              const job = jobs.find((j) => String(j.id) === e.target.value);
              if (job) setRole(job.label);
            }}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Just the role above</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.label}
              </option>
            ))}
          </select>
        </div>
      )}
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
        {pending ? "Writing questions…" : "Start interview"}
      </Button>
    </form>
  );
}
