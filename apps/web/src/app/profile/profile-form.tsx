"use client";

import { allKnownSkills } from "@career-os/engine";
import { INDIA_CITIES, type Experience, type Profile } from "@career-os/shared";
import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateProfile } from "@/app/actions/profile";
import { TagInput } from "@/components/tag-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const toLpa = (inr: number | null) => (inr ? String(inr / 100000) : "");
const fromLpa = (lpa: string) => (lpa.trim() ? Math.round(Number(lpa) * 100000) : null);

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-t pt-8 md:grid-cols-[220px_1fr]">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
        {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [p, setP] = useState(profile);
  const [ctc, setCtc] = useState({ current: toLpa(profile.currentCtcInr), expected: toLpa(profile.expectedCtcInr) });
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((prev) => ({ ...prev, [k]: v }));

  const setExp = (i: number, patch: Partial<Experience>) =>
    set("experience", p.experience.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  const save = () =>
    startTransition(async () => {
      const res = await updateProfile({
        ...p,
        currentCtcInr: fromLpa(ctc.current),
        expectedCtcInr: fromLpa(ctc.expected),
      });
      if (res.ok) toast.success("Profile saved. Open jobs were re-scored.");
      else toast.error(res.error);
    });

  return (
    <form
      className="space-y-8 animate-rise"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Section title="Basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input value={p.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="City">
            <select
              value={p.city}
              onChange={(e) => set("city", e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              {INDIA_CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Email">
            <Input type="email" value={p.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={p.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="LinkedIn">
            <Input value={p.linkedin} onChange={(e) => set("linkedin", e.target.value)} />
          </Field>
          <Field label="GitHub">
            <Input value={p.github} onChange={(e) => set("github", e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="About you" hint="One line and a short summary, in your own words.">
        <Field label="Headline">
          <Input
            value={p.headline}
            placeholder="Backend engineer, 4 years, payments"
            onChange={(e) => set("headline", e.target.value)}
          />
        </Field>
        <Field label="Summary">
          <Textarea rows={4} value={p.summary} onChange={(e) => set("summary", e.target.value)} />
        </Field>
      </Section>

      <Section title="What you are looking for" hint="Used for fit scores and for CTC and notice period answers.">
        <Field label="Job titles you want">
          <TagInput value={p.targetTitles} onChange={(v) => set("targetTitles", v)} placeholder="Sr. SDE, Senior Software Engineer" />
          <p className="text-xs text-muted-foreground">These drive job search. Be specific — not just &quot;software engineer&quot;.</p>
        </Field>
        <Field label="Cities you'd work in">
          <TagInput value={p.preferredCities} onChange={(v) => set("preferredCities", v)} suggestions={INDIA_CITIES} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Years of experience">
            <Input
              type="number"
              min={0}
              step={0.5}
              value={p.yearsExperience}
              onChange={(e) => set("yearsExperience", Number(e.target.value))}
            />
          </Field>
          <Field label="Current CTC (LPA)">
            <Input inputMode="decimal" value={ctc.current} onChange={(e) => setCtc({ ...ctc, current: e.target.value })} />
          </Field>
          <Field label="Expected CTC (LPA)">
            <Input inputMode="decimal" value={ctc.expected} onChange={(e) => setCtc({ ...ctc, expected: e.target.value })} />
          </Field>
          <Field label="Notice period (days)">
            <Input
              type="number"
              min={0}
              value={p.noticePeriodDays ?? ""}
              onChange={(e) => set("noticePeriodDays", e.target.value === "" ? null : Number(e.target.value))}
            />
          </Field>
        </div>
      </Section>

      <Section title="Skills" hint="Only list what you'd be fine being asked about in an interview.">
        <TagInput
          value={p.skills}
          onChange={(v) => set("skills", v)}
          placeholder="Add a skill"
          suggestions={allKnownSkills().filter((s) => p.resumeText.toLowerCase().includes(s.toLowerCase().split(" ")[0]))}
        />
      </Section>

      <Section title="Experience" hint="Drafts only reorder and reword these bullets. They never add new ones.">
        {p.experience.map((exp, i) => (
          <div key={i} className="grid gap-3 rounded-xl border bg-card p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_120px_120px_auto]">
              <Input placeholder="Title" value={exp.title} onChange={(e) => setExp(i, { title: e.target.value })} />
              <Input placeholder="Company" value={exp.company} onChange={(e) => setExp(i, { company: e.target.value })} />
              <Input placeholder="Start" value={exp.start} onChange={(e) => setExp(i, { start: e.target.value })} />
              <Input placeholder="End" value={exp.end} onChange={(e) => setExp(i, { end: e.target.value })} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove role"
                onClick={() => set("experience", p.experience.filter((_, idx) => idx !== i))}
              >
                <Trash2 />
              </Button>
            </div>
            <Textarea
              rows={Math.max(3, exp.bullets.length + 1)}
              placeholder="One bullet per line"
              value={exp.bullets.join("\n")}
              onChange={(e) => setExp(i, { bullets: e.target.value.split("\n") })}
              onBlur={(e) => setExp(i, { bullets: e.target.value.split("\n").map((b) => b.trim()).filter(Boolean) })}
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={() => set("experience", [...p.experience, { title: "", company: "", start: "", end: "", bullets: [] }])}
        >
          <Plus /> Add a role
        </Button>
      </Section>

      <Section title="Education">
        <Textarea
          rows={3}
          value={p.education.join("\n")}
          placeholder="B.Tech, Computer Science, VIT, 2020"
          onChange={(e) => set("education", e.target.value.split("\n"))}
          onBlur={(e) => set("education", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
        />
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" size="lg" disabled={pending} className="px-6 shadow-md">
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
