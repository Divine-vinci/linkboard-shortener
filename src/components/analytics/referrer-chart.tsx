"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { BAR_COLORS } from "@/components/analytics/chart-colors";
import type { ReferrerBreakdownItem } from "@/lib/db/analytics";

function buildSummary(data: ReferrerBreakdownItem[]) {
  if (data.length === 0) {
    return "No referrer data is available yet for this link.";
  }

  const totalClicks = data.reduce((sum, item) => sum + item.clicks, 0);
  const parts = data.map((item) => `${item.domain}: ${item.clicks}`);

  return `${data.length} referrer sources totalling ${totalClicks} clicks. ${parts.join(", ")}.`;
}

export function ReferrerChart({ data }: { data: ReferrerBreakdownItem[] }) {
  const summary = buildSummary(data);

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6" aria-label="Referrer analytics">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">Referrers</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">Top traffic sources</h2>
        <p className="text-sm text-zinc-400">Domains are grouped to show which sources drive the most clicks.</p>
      </div>

      <p className="mt-4 text-sm text-zinc-300" aria-live="polite">
        {summary}
      </p>

      {data.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/50 p-8 text-center">
          <p className="text-lg font-semibold text-zinc-100">No referrer data yet</p>
          <p className="mt-2 text-sm text-zinc-400">
            Referrer domains will appear here after visitors arrive from external sources.
          </p>
        </div>
      ) : (
        <div className="mt-6 h-80 w-full" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 16, right: 40, left: 16, bottom: 0 }}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} stroke="#a1a1aa" tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="domain"
                width={120}
                stroke="#a1a1aa"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "0.75rem" }}
                itemStyle={{ color: "#d4d4d8" }}
                labelStyle={{ color: "#a1a1aa" }}
              />
              <Bar dataKey="clicks" radius={[0, 12, 12, 0]}>
                {data.map((item, index) => (
                  <Cell key={item.domain} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
                <LabelList dataKey="clicks" position="right" fill="#e4e4e7" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
