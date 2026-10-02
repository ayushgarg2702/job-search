"use client";

import type { CursorStatus } from "@career-os/agents";
import type { Settings } from "@career-os/shared";
import { CheckCircle2, CircleAlert, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { checkCursor, updateSettings } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

function Status({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-sm">
      {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-leaf" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-marigold" />}
      <span>{children}</span>
    </p>
  );
}

export function SettingsForm({
  settings,
  cursor: initialCursor,
  workers,
}: {
  settings: Settings;
  cursor: CursorStatus;
  workers: { jobspy: boolean; browser: boolean };
}) {
  const [s, setS] = useState(settings);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid max-w-3xl gap-10 animate-rise">
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-ink">Cursor agent</h2>
        <p className="text-sm text-muted-foreground">
          Resumes, cover letters and interview feedback are written by Cursor Agent using your Cursor account. No other AI keys.
        </p>
        <Status ok={cursor.installed && cursor.loggedIn !== false}>
          {cursor.installed ? `${cursor.bin} ${cursor.version}. ` : ""}
          {cursor.detail}
        </Status>
        {!cursor.installed && (
          <pre className="overflow-x-auto rounded-lg bg-ink p-3 font-mono text-xs text-primary-foreground">
            curl https://cursor.com/install -fsS | bash{"\n"}agent login
          </pre>
        )}
        <Button variant="outline" size="sm" onClick={() => startTransition(async () => setCursor(await checkCursor()))}>
          <RefreshCw className={pending ? "animate-spin" : ""} /> Check again
        </Button>
        <div className="grid gap-1.5 pt-2">
          <Label htmlFor="model">Model (optional)</Label>
          <Input
            id="model"
            value={s.cursorModel}
            placeholder="Leave empty to use your Cursor default"
            onChange={(e) => setS({ ...s, cursorModel: e.target.value })}
            className="max-w-sm"
          />
          <span className="text-xs text-muted-foreground">
            Any model name from <code className="font-mono">agent --list-models</code>.
          </span>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-xl font-semibold text-ink">Drafts</h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="autodraft">Write drafts automatically</Label>
            <p className="text-sm text-muted-foreground">For new jobs that score at or above the threshold and have no blockers.</p>
          </div>
          <Switch id="autodraft" checked={s.autoDraft} onCheckedChange={(v) => setS({ ...s, autoDraft: v })} />
        </div>
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label>Fit threshold</Label>
            <span className="font-mono text-sm font-semibold text-ink">{s.draftThreshold}</span>
          </div>
          <Slider
            min={0}
            max={100}
            step={5}
            value={[s.draftThreshold]}
            onValueChange={(v) => setS({ ...s, draftThreshold: Array.isArray(v) ? v[0] : v })}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-ink">Local helpers</h2>
        <Status ok={workers.jobspy}>
          JobSpy worker {workers.jobspy ? "is running" : "is not running. Start it with pnpm worker:jobspy"}
        </Status>
        <Status ok={workers.browser}>
          Browser worker {workers.browser ? "is running" : "is not running. Start it with pnpm worker:browser"}
        </Status>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>JobSpy worker URL</Label>
            <Input value={s.jobspyUrl} onChange={(e) => setS({ ...s, jobspyUrl: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>Browser worker URL</Label>
            <Input value={s.browserWorkerUrl} onChange={(e) => setS({ ...s, browserWorkerUrl: e.target.value })} />
          </div>
        </div>
      </section>

      <Button
        size="lg"
        className="w-fit"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await updateSettings(s);
            if (res.ok) toast.success("Settings saved.");
            else toast.error(res.error);
          })
        }
      >
        Save settings
      </Button>
    </div>
  );
}
