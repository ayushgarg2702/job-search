"use client";

import { FileUp, Loader2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { uploadResume } from "@/app/actions/profile";
import { cn } from "@/lib/utils";

export function ResumeUpload({ fileName }: { fileName: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();

  const send = (file: File) => {
    const fd = new FormData();
    fd.set("resume", file);
    startTransition(async () => {
      const res = await uploadResume(fd);
      if (res.ok) toast.success(res.message);
      else toast.error(res.error);
    });
  };

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) send(f);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-card/70 px-6 py-10 text-center transition-colors animate-rise",
        dragging ? "border-marigold bg-accent/50" : "hover:border-ink/40",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) send(f);
          e.target.value = "";
        }}
      />
      {pending ? (
        <Loader2 className="size-8 animate-spin text-ink" />
      ) : (
        <FileUp className="size-8 text-ink" />
      )}
      <div>
        <p className="font-display text-lg font-semibold text-ink">
          {pending ? "Reading your resume…" : fileName ? "Upload a newer version" : "Drop your resume here"}
        </p>
        <p className="text-sm text-muted-foreground">
          {fileName ? `Current file: ${fileName}. ` : ""}PDF, DOCX or TXT. It stays on this machine.
        </p>
      </div>
    </label>
  );
}
