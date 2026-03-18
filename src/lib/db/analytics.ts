import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/client";

export type AnalyticsGranularity = "daily" | "weekly" | "monthly";

export type LinkAnalyticsOverview = {
  id: string;
  slug: string;
  targetUrl: string;
  totalClicks: number;
};

export type LinkClicksTimeseriesPoint = {
  label: string;
  periodStart: string;
  clicks: number;
};

type TimeseriesRow = {
  period: Date | string;
  clicks: number;
};

function getIsoWeek(date: Date) {
  const normalized = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = normalized.getUTCDay() || 7;
  normalized.setUTCDate(normalized.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(normalized.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((normalized.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);

  return {
    week,
    year: normalized.getUTCFullYear(),
  };
}

function formatBucketLabel(granularity: AnalyticsGranularity, period: Date) {
  if (granularity === "monthly") {
    return `${period.getUTCFullYear()}-${String(period.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  if (granularity === "weekly") {
    const { year, week } = getIsoWeek(period);
    return `${year}-W${String(week).padStart(2, "0")}`;
  }

  return period.toISOString().slice(0, 10);
}

export async function getLinkAnalyticsOverview(userId: string, linkId: string): Promise<LinkAnalyticsOverview | null> {
  const link = await prisma.link.findFirst({
    where: {
      id: linkId,
      userId,
    },
    select: {
      id: true,
      slug: true,
      targetUrl: true,
      _count: {
        select: {
          clickEvents: true,
        },
      },
    },
  });

  if (!link) {
    return null;
  }

  return {
    id: link.id,
    slug: link.slug,
    targetUrl: link.targetUrl,
    totalClicks: link._count.clickEvents,
  };
}

export async function getLinkClicksTimeseries(
  userId: string,
  linkId: string,
  granularity: AnalyticsGranularity,
): Promise<LinkClicksTimeseriesPoint[]> {
  const truncUnit = {
    daily: Prisma.raw("'day'"),
    weekly: Prisma.raw("'week'"),
    monthly: Prisma.raw("'month'"),
  }[granularity];

  const rows = await prisma.$queryRaw<TimeseriesRow[]>(Prisma.sql`
    SELECT
      date_trunc(${truncUnit}, ce.clicked_at) AS period,
      COUNT(*)::int AS clicks
    FROM public.click_events ce
    INNER JOIN public.links l ON l.id = ce.link_id
    WHERE ce.link_id = CAST(${linkId} AS uuid)
      AND l.user_id = CAST(${userId} AS uuid)
    GROUP BY period
    ORDER BY period ASC
  `);

  return rows.map((row) => {
    const period = row.period instanceof Date ? row.period : new Date(row.period);

    return {
      label: formatBucketLabel(granularity, period),
      periodStart: period.toISOString(),
      clicks: row.clicks,
    };
  });
}
