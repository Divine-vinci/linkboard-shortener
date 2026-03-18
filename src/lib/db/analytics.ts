import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/client";

export type AnalyticsGranularity = "daily" | "weekly" | "monthly";

export type LinkAnalyticsOverview = {
  id: string;
  slug: string;
  targetUrl: string;
  totalClicks: number;
};

export type BoardLinkClickItem = {
  id: string;
  slug: string;
  title: string | null;
  clicks: number;
};

export type BoardAnalyticsOverview = {
  boardName: string;
  totalClicks: number;
  linkCount: number;
  topLinks: BoardLinkClickItem[];
};

export type LinkClicksTimeseriesPoint = {
  label: string;
  periodStart: string;
  clicks: number;
};

export type ReferrerBreakdownItem = {
  domain: string;
  clicks: number;
};

export type GeoBreakdownItem = {
  country: string;
  clicks: number;
};

type TimeseriesRow = {
  period: Date | string;
  clicks: number;
};

type ReferrerBreakdownRow = {
  domain: string;
  clicks: number;
};

type GeoBreakdownRow = {
  country: string;
  clicks: number;
};

type BoardLinkClickRow = {
  id: string;
  slug: string;
  title: string | null;
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

export async function getBoardAnalyticsOverview(userId: string, boardId: string): Promise<BoardAnalyticsOverview | null> {
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      userId,
    },
    select: {
      name: true,
      _count: {
        select: {
          boardLinks: true,
        },
      },
    },
  });

  if (!board) {
    return null;
  }

  const topLinks = await prisma.$queryRaw<BoardLinkClickRow[]>(Prisma.sql`
    SELECT
      l.id,
      l.slug,
      l.title,
      COUNT(ce.id)::int AS clicks
    FROM public.links l
    INNER JOIN public.board_links bl ON bl.link_id = l.id
    INNER JOIN public.boards b ON b.id = bl.board_id
    LEFT JOIN public.click_events ce ON ce.link_id = l.id
    WHERE bl.board_id = CAST(${boardId} AS uuid)
      AND b.user_id = CAST(${userId} AS uuid)
      AND l.user_id = CAST(${userId} AS uuid)
    GROUP BY l.id, l.slug, l.title
    ORDER BY clicks DESC, l.slug ASC
  `);

  const totalClicks = topLinks.reduce((sum, link) => sum + link.clicks, 0);

  return {
    boardName: board.name,
    totalClicks,
    linkCount: board._count.boardLinks,
    topLinks: topLinks.map((link) => ({
      id: link.id,
      slug: link.slug,
      title: link.title,
      clicks: link.clicks,
    })),
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

export async function getBoardClicksTimeseries(
  userId: string,
  boardId: string,
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
    INNER JOIN public.board_links bl ON bl.link_id = ce.link_id
    INNER JOIN public.boards b ON b.id = bl.board_id
    WHERE bl.board_id = CAST(${boardId} AS uuid)
      AND b.user_id = CAST(${userId} AS uuid)
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

export async function getLinkReferrerBreakdown(userId: string, linkId: string): Promise<ReferrerBreakdownItem[]> {
  const rows = await prisma.$queryRaw<ReferrerBreakdownRow[]>(Prisma.sql`
    SELECT
      CASE
        WHEN ce.referrer IS NULL OR btrim(ce.referrer) = '' THEN 'Direct / Unknown'
        ELSE split_part(
          regexp_replace(ce.referrer, '^[a-zA-Z][a-zA-Z0-9+.-]*://(www\.)?', ''),
          '/',
          1
        )
      END AS domain,
      COUNT(*)::int AS clicks
    FROM public.click_events ce
    INNER JOIN public.links l ON l.id = ce.link_id
    WHERE ce.link_id = CAST(${linkId} AS uuid)
      AND l.user_id = CAST(${userId} AS uuid)
    GROUP BY domain
    ORDER BY clicks DESC, domain ASC
    LIMIT 10
  `);

  return rows.map((row) => ({
    domain: row.domain,
    clicks: row.clicks,
  }));
}

export async function getBoardReferrerBreakdown(userId: string, boardId: string): Promise<ReferrerBreakdownItem[]> {
  const rows = await prisma.$queryRaw<ReferrerBreakdownRow[]>(Prisma.sql`
    SELECT
      CASE
        WHEN ce.referrer IS NULL OR btrim(ce.referrer) = '' THEN 'Direct / Unknown'
        ELSE split_part(
          regexp_replace(ce.referrer, '^[a-zA-Z][a-zA-Z0-9+.-]*://(www\.)?', ''),
          '/',
          1
        )
      END AS domain,
      COUNT(*)::int AS clicks
    FROM public.click_events ce
    INNER JOIN public.board_links bl ON bl.link_id = ce.link_id
    INNER JOIN public.boards b ON b.id = bl.board_id
    WHERE bl.board_id = CAST(${boardId} AS uuid)
      AND b.user_id = CAST(${userId} AS uuid)
    GROUP BY domain
    ORDER BY clicks DESC, domain ASC
    LIMIT 10
  `);

  return rows.map((row) => ({
    domain: row.domain,
    clicks: row.clicks,
  }));
}

export async function getLinkGeoBreakdown(userId: string, linkId: string): Promise<GeoBreakdownItem[]> {
  const rows = await prisma.$queryRaw<GeoBreakdownRow[]>(Prisma.sql`
    SELECT country, clicks
    FROM (
      SELECT
        CASE
          WHEN ce.country IS NULL OR btrim(ce.country) = '' THEN 'Unknown'
          ELSE upper(ce.country)
        END AS country,
        COUNT(*)::int AS clicks
      FROM public.click_events ce
      INNER JOIN public.links l ON l.id = ce.link_id
      WHERE ce.link_id = CAST(${linkId} AS uuid)
        AND l.user_id = CAST(${userId} AS uuid)
      GROUP BY 1
    ) grouped
    ORDER BY clicks DESC, (CASE WHEN country = 'Unknown' THEN 1 ELSE 0 END) ASC, country ASC
  `);

  return rows.map((row) => ({
    country: row.country,
    clicks: row.clicks,
  }));
}

export async function getBoardGeoBreakdown(userId: string, boardId: string): Promise<GeoBreakdownItem[]> {
  const rows = await prisma.$queryRaw<GeoBreakdownRow[]>(Prisma.sql`
    SELECT country, clicks
    FROM (
      SELECT
        CASE
          WHEN ce.country IS NULL OR btrim(ce.country) = '' THEN 'Unknown'
          ELSE upper(ce.country)
        END AS country,
        COUNT(*)::int AS clicks
      FROM public.click_events ce
      INNER JOIN public.board_links bl ON bl.link_id = ce.link_id
      INNER JOIN public.boards b ON b.id = bl.board_id
      WHERE bl.board_id = CAST(${boardId} AS uuid)
        AND b.user_id = CAST(${userId} AS uuid)
      GROUP BY 1
    ) grouped
    ORDER BY clicks DESC, (CASE WHEN country = 'Unknown' THEN 1 ELSE 0 END) ASC, country ASC
  `);

  return rows.map((row) => ({
    country: row.country,
    clicks: row.clicks,
  }));
}
