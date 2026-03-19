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
import type { GeoBreakdownItem } from "@/lib/db/analytics";

const COUNTRY_LABELS: Record<string, string> = {
  AR: "Argentina",
  AU: "Australia",
  BD: "Bangladesh",
  BR: "Brazil",
  CA: "Canada",
  CN: "China",
  CO: "Colombia",
  DE: "Germany",
  EG: "Egypt",
  ES: "Spain",
  FR: "France",
  GB: "United Kingdom",
  GH: "Ghana",
  ID: "Indonesia",
  IN: "India",
  IT: "Italy",
  JP: "Japan",
  KE: "Kenya",
  KR: "South Korea",
  MX: "Mexico",
  MY: "Malaysia",
  NG: "Nigeria",
  NL: "Netherlands",
  PH: "Philippines",
  PK: "Pakistan",
  PL: "Poland",
  PT: "Portugal",
  RU: "Russia",
  SA: "Saudi Arabia",
  SE: "Sweden",
  SG: "Singapore",
  TH: "Thailand",
  TR: "Turkey",
  UA: "Ukraine",
  US: "United States",
  VN: "Vietnam",
  ZA: "South Africa",
};

function getCountryLabel(country: string) {
  if (country === "Unknown") {
    return "Unknown";
  }

  return COUNTRY_LABELS[country] ? `${COUNTRY_LABELS[country]} (${country})` : country;
}

function buildSummary(data: GeoBreakdownItem[]) {
  if (data.length === 0) {
    return "No geographic data is available yet for this link.";
  }

  const totalClicks = data.reduce((sum, item) => sum + item.clicks, 0);
  const parts = data.map((item) => `${getCountryLabel(item.country)}: ${item.clicks}`);

  return `${data.length} countries totalling ${totalClicks} clicks. ${parts.join(", ")}.`;
}

export function GeoChart({ data }: { data: GeoBreakdownItem[] }) {
  const chartData = data.map((item) => ({
    ...item,
    label: getCountryLabel(item.country),
  }));
  const summary = buildSummary(data);

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6" aria-label="Geographic analytics">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">Geography</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">Country distribution</h2>
        <p className="text-sm text-zinc-400">Country totals show where clicks originate based on ISO 3166-1 country codes.</p>
      </div>

      <p className="mt-4 text-sm text-zinc-300" aria-live="polite">
        {summary}
      </p>

      {chartData.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/50 p-8 text-center">
          <p className="text-lg font-semibold text-zinc-100">No geographic data yet</p>
          <p className="mt-2 text-sm text-zinc-400">
            Country distribution will appear here once visits include geo metadata.
          </p>
        </div>
      ) : (
        <div className="mt-6 h-80 w-full" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 16, right: 40, left: 16, bottom: 0 }}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} stroke="#a1a1aa" tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="label"
                width={160}
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
                {chartData.map((item, index) => (
                  <Cell key={`${item.country}-${item.label}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
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
