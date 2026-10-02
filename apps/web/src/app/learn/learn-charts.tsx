"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

export function StudyChart({ data }: { data: { day: string; minutes: number }[] }) {
  const config: ChartConfig = { minutes: { label: "Minutes", color: "var(--chart-2)" } };
  return (
    <ChartContainer config={config} className="h-56 w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} interval={6} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="minutes" fill="var(--color-minutes)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function MockTrendChart({ data }: { data: { n: string; score: number; date: string }[] }) {
  const config: ChartConfig = { score: { label: "Avg score", color: "var(--chart-4)" } };
  return (
    <ChartContainer config={config} className="h-56 w-full">
      <LineChart data={data} margin={{ top: 10, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={30} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line dataKey="score" stroke="var(--color-score)" strokeWidth={3} dot={{ r: 4, fill: "var(--color-score)" }} />
      </LineChart>
    </ChartContainer>
  );
}
