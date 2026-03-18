import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BoardAnalyticsHeader } from "@/components/analytics/board-analytics-header";
import { BoardLinksTable } from "@/components/analytics/board-links-table";
import { ClicksTimeseriesChart } from "@/components/analytics/clicks-timeseries-chart";
import { GeoChart } from "@/components/analytics/geo-chart";
import { ReferrerChart } from "@/components/analytics/referrer-chart";
import { auth } from "@/lib/auth/config";
import {
  getBoardAnalyticsOverview,
  getBoardClicksTimeseries,
  getBoardGeoBreakdown,
  getBoardReferrerBreakdown,
} from "@/lib/db/analytics";
import { findBoardSummaryById } from "@/lib/db/boards";

export const metadata: Metadata = {
  title: "Board analytics — Linkboard",
};

export default async function BoardAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  const { id } = await params;

  if (!userId) {
    notFound();
  }

  const board = await findBoardSummaryById(id);

  if (!board || board.userId !== userId) {
    notFound();
  }

  const [overview, daily, weekly, monthly, referrers, geo] = await Promise.all([
    getBoardAnalyticsOverview(userId, id),
    getBoardClicksTimeseries(userId, id, "daily"),
    getBoardClicksTimeseries(userId, id, "weekly"),
    getBoardClicksTimeseries(userId, id, "monthly"),
    getBoardReferrerBreakdown(userId, id),
    getBoardGeoBreakdown(userId, id),
  ]);

  if (!overview) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <BoardAnalyticsHeader
        boardName={overview.boardName}
        totalClicks={overview.totalClicks}
        linkCount={overview.linkCount}
      />
      <BoardLinksTable links={overview.topLinks} totalClicks={overview.totalClicks} />
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
