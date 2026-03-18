"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AnalyticsGranularity, LinkClicksTimeseriesPoint } from "@/lib/db/analytics";

const GRANULARITY_LABELS: Record<AnalyticsGranularity, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

function buildSummary(granularity: AnalyticsGranularity, points: LinkClicksTimeseriesPoint[]) {
  if (points.length === 0) {
    return `No click data is available for the selected ${granularity} range.`;
  }

  const totalClicks = points.reduce((sum, point) => sum + point.clicks, 0);
  const firstLabel = points[0]?.label ?? "";
  const lastLabel = points[points.length - 1]?.label ?? "";
  const bucketLabel = points.length === 1 ? "bucket" : "buckets";

  return `Showing ${totalClicks} total clicks across ${points.length} ${granularity} ${bucketLabel} from ${firstLabel} to ${lastLabel}.`;
}

export function ClicksTimeseriesChart({
  datasets,
  initialGranularity = "daily",
}: {
  datasets: Record<AnalyticsGranularity, LinkClicksTimeseriesPoint[]>;
  initialGranularity?: AnalyticsGranularity;
}) {
  const [granularity, setGranularity] = useState<AnalyticsGranularity>(initialGranularity);
  const points = datasets[granularity] ?? [];
  const summary = buildSummary(granularity, points);

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">Clicks over time</p>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">Trend chart</h2>
          <p className="text-sm text-zinc-400">Switch aggregation to compare short-term spikes with broader trends.</p>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Analytics aggregation">
          {(["daily", "weekly", "monthly"] as const).map((option) => {
            const isActive = option === granularity;

            return (
              <button
                key={option}
                type="button"
                aria-pressed={isActive}
                onClick={() => setGranularity(option)}
                className={`min-h-11 rounded-2xl border px-4 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 ${
                  isActive
                    ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
                    : "border-zinc-700 text-zinc-200 hover:border-emerald-400/50 hover:text-emerald-200"
                }`}
              >
                {GRANULARITY_LABELS[option]}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-sm text-zinc-300" aria-live="polite">
        {summary}
      </p>

      {points.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/50 p-8 text-center">
          <p className="text-lg font-semibold text-zinc-100">No clicks yet</p>
          <p className="mt-2 text-sm text-zinc-400">
            No clicks have been recorded for this link yet. The chart will populate once visits arrive.
          </p>
        </div>
      ) : (
        <div className="mt-6 h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#a1a1aa" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} stroke="#a1a1aa" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "0.75rem" }} itemStyle={{ color: "#d4d4d8" }} labelStyle={{ color: "#a1a1aa" }} />
              <Line type="monotone" dataKey="clicks" stroke="#34d399" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
