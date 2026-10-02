"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const FUNNEL_COLORS = ["var(--chart-3)", "var(--chart-2)", "var(--chart-1)", "var(--chart-1)", "var(--chart-4)", "var(--chart-5)"];

export function FunnelChart({ data }: { data: { stage: string; count: number }[] }) {
  const config: ChartConfig = { count: { label: "Jobs" } };
  return (
    <ChartContainer config={config} className="h-72 w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 40 }}>
        <XAxis type="number" hide />
        <YAxis dataKey="stage" type="category" tickLine={false} axisLine={false} width={86} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="count" radius={6}>
          {data.map((_, i) => (
            <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
          ))}
          <LabelList dataKey="count" position="right" className="fill-foreground font-mono text-xs" />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function WeeklyChart({ data, target }: { data: { week: string; sent: number }[]; target: number | null }) {
  const config: ChartConfig = { sent: { label: "Submitted", color: "var(--chart-1)" } };
  return (
    <ChartContainer config={config} className="h-64 w-full">
      <BarChart data={data} margin={{ top: 16 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="week" tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {target ? (
          <ReferenceLine
            y={target}
            stroke="var(--marigold)"
            strokeDasharray="5 4"
            label={{ value: `Target ${target}`, position: "insideTopRight", fill: "var(--accent-foreground)", fontSize: 11 }}
          />
        ) : null}
        <Bar dataKey="sent" fill="var(--color-sent)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function CityChart({ data }: { data: { key: string; sent: number; interviews: number }[] }) {
  const config: ChartConfig = {
    sent: { label: "Applied", color: "var(--chart-2)" },
    interviews: { label: "Interviews", color: "var(--chart-4)" },
  };
  return (
    <ChartContainer config={config} className="h-72 w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis dataKey="key" type="category" tickLine={false} axisLine={false} width={110} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="sent" fill="var(--color-sent)" radius={4} />
        <Bar dataKey="interviews" fill="var(--color-interviews)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}

export function SimpleBars({ data, label }: { data: { key: string; n: number }[]; label: string }) {
  const config: ChartConfig = { n: { label, color: "var(--chart-1)" } };
  return (
    <ChartContainer config={config} className="h-64 w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 32 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis dataKey="key" type="category" tickLine={false} axisLine={false} width={110} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="n" fill="var(--color-n)" radius={4}>
          <LabelList dataKey="n" position="right" className="fill-foreground font-mono text-xs" />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
