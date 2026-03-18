import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClicksTimeseriesChart } from "@/components/analytics/clicks-timeseries-chart";
import { LinkAnalyticsHeader } from "@/components/analytics/link-analytics-header";
import { auth } from "@/lib/auth/config";
import { getLinkAnalyticsOverview, getLinkClicksTimeseries } from "@/lib/db/analytics";

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

  const [daily, weekly, monthly] = await Promise.all([
    getLinkClicksTimeseries(userId, id, "daily"),
    getLinkClicksTimeseries(userId, id, "weekly"),
    getLinkClicksTimeseries(userId, id, "monthly"),
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
    </section>
  );
}
