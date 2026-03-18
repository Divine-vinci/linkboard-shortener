import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClicksTimeseriesChart } from "@/components/analytics/clicks-timeseries-chart";
import { GeoChart } from "@/components/analytics/geo-chart";
import { LinkAnalyticsHeader } from "@/components/analytics/link-analytics-header";
import { ReferrerChart } from "@/components/analytics/referrer-chart";
import { auth } from "@/lib/auth/config";
import {
  getLinkAnalyticsOverview,
  getLinkClicksTimeseries,
  getLinkGeoBreakdown,
  getLinkReferrerBreakdown,
} from "@/lib/db/analytics";

export const metadata: Metadata = {
  title: "Link analytics — Linkboard",
};

export default async function LinkAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  const { id } = await params;

  if (!userId) {
    notFound();
  }

  const overview = await getLinkAnalyticsOverview(userId, id);

  if (!overview) {
    notFound();
  }

  const [daily, weekly, monthly, referrers, geo] = await Promise.all([
    getLinkClicksTimeseries(userId, id, "daily"),
    getLinkClicksTimeseries(userId, id, "weekly"),
    getLinkClicksTimeseries(userId, id, "monthly"),
    getLinkReferrerBreakdown(userId, id),
    getLinkGeoBreakdown(userId, id),
  ]);

  return (
    <section className="space-y-6">
      <LinkAnalyticsHeader
        slug={overview.slug}
        targetUrl={overview.targetUrl}
        totalClicks={overview.totalClicks}
      />
      <ClicksTimeseriesChart
        datasets={{
          daily,
          weekly,
          monthly,
        }}
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <ReferrerChart data={referrers} />
        <GeoChart data={geo} />
      </div>
    </section>
  );
}
