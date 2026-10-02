"use client";

import { MANUAL_STATUSES, STATUS_LABEL, type JobStatus } from "@career-os/shared";
import { useTransition } from "react";
import { toast } from "sonner";
import { markStatus } from "@/app/actions/jobs";

export function StatusMenu({ jobId, status }: { jobId: number; status: JobStatus }) {
  const [pending, startTransition] = useTransition();
  const options: JobStatus[] = MANUAL_STATUSES.filter((s) => s !== "declined");
  return (
    <select
      aria-label="Move to"
      disabled={pending}
      value={options.includes(status) ? status : ""}
      onChange={(e) =>
        startTransition(async () => {
          const res = await markStatus(jobId, e.target.value);
          if (!res.ok) toast.error(res.error);
        })
      }
      className="h-6 rounded-md border border-input bg-transparent px-1 text-[0.7rem]"
    >
      {!options.includes(status) && <option value="">Move to…</option>}
      {options.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}
