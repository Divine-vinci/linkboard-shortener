// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirstMock, queryRawMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  queryRawMock: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    link: {
      findFirst: findFirstMock,
    },
    $queryRaw: queryRawMock,
  },
}));

const {
  getLinkAnalyticsOverview,
  getLinkClicksTimeseries,
  getLinkGeoBreakdown,
  getLinkReferrerBreakdown,
} = await import("./analytics");

describe("src/lib/db/analytics.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns link overview scoped to the owner", async () => {
    findFirstMock.mockResolvedValue({
      id: "link-123",
      slug: "launch-docs",
      targetUrl: "https://example.com/docs",
      _count: {
        clickEvents: 12,
      },
    });

    await expect(getLinkAnalyticsOverview("user-123", "link-123")).resolves.toEqual({
      id: "link-123",
      slug: "launch-docs",
      targetUrl: "https://example.com/docs",
      totalClicks: 12,
    });
    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        id: "link-123",
        userId: "user-123",
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
  });

  it("returns null when the requested link is not owned by the user", async () => {
    findFirstMock.mockResolvedValue(null);

    await expect(getLinkAnalyticsOverview("user-123", "link-404")).resolves.toBeNull();
  });

  it("returns zero-state payloads for links without clicks", async () => {
    findFirstMock.mockResolvedValue({
      id: "link-123",
      slug: "launch-docs",
      targetUrl: "https://example.com/docs",
      _count: {
        clickEvents: 0,
      },
    });
    queryRawMock.mockResolvedValue([]);

    await expect(getLinkAnalyticsOverview("user-123", "link-123")).resolves.toMatchObject({ totalClicks: 0 });
    await expect(getLinkClicksTimeseries("user-123", "link-123", "daily")).resolves.toEqual([]);
    await expect(getLinkReferrerBreakdown("user-123", "link-123")).resolves.toEqual([]);
    await expect(getLinkGeoBreakdown("user-123", "link-123")).resolves.toEqual([]);
  });

  it("returns ascending daily buckets", async () => {
    queryRawMock.mockResolvedValue([
      { period: new Date("2026-03-16T00:00:00.000Z"), clicks: 2 },
      { period: new Date("2026-03-17T00:00:00.000Z"), clicks: 5 },
    ]);

    await expect(getLinkClicksTimeseries("user-123", "link-123", "daily")).resolves.toEqual([
      {
        label: "2026-03-16",
        periodStart: "2026-03-16T00:00:00.000Z",
        clicks: 2,
      },
      {
        label: "2026-03-17",
        periodStart: "2026-03-17T00:00:00.000Z",
        clicks: 5,
      },
    ]);
  });

  it("returns consistent weekly and monthly labels", async () => {
    queryRawMock
      .mockResolvedValueOnce([{ period: new Date("2026-03-16T00:00:00.000Z"), clicks: 7 }])
      .mockResolvedValueOnce([{ period: new Date("2026-03-01T00:00:00.000Z"), clicks: 14 }]);

    await expect(getLinkClicksTimeseries("user-123", "link-123", "weekly")).resolves.toEqual([
      {
        label: "2026-W12",
        periodStart: "2026-03-16T00:00:00.000Z",
        clicks: 7,
      },
    ]);
    await expect(getLinkClicksTimeseries("user-123", "link-123", "monthly")).resolves.toEqual([
      {
        label: "2026-03",
        periodStart: "2026-03-01T00:00:00.000Z",
        clicks: 14,
      },
    ]);
  });

  it("returns top referrer domains with ownership-scoped aggregation", async () => {
    queryRawMock.mockResolvedValue([
      { domain: "twitter.com", clicks: 8 },
      { domain: "Direct / Unknown", clicks: 3 },
    ]);

    await expect(getLinkReferrerBreakdown("user-123", "link-123")).resolves.toEqual([
      { domain: "twitter.com", clicks: 8 },
      { domain: "Direct / Unknown", clicks: 3 },
    ]);

    const statement = queryRawMock.mock.calls[0]?.[0];
    const sqlText = Array.isArray(statement?.strings) ? statement.strings.join(" ") : "";

    expect(sqlText).toContain("regexp_replace(ce.referrer,");
    expect(sqlText).toContain("INNER JOIN public.links l ON l.id = ce.link_id");
    expect(sqlText).toContain("l.user_id = CAST(");
    expect(sqlText).toContain("LIMIT 10");
  });

  it("returns geographic breakdown with null countries grouped as Unknown", async () => {
    queryRawMock.mockResolvedValue([
      { country: "US", clicks: 6 },
      { country: "Unknown", clicks: 2 },
    ]);

    await expect(getLinkGeoBreakdown("user-123", "link-123")).resolves.toEqual([
      { country: "US", clicks: 6 },
      { country: "Unknown", clicks: 2 },
    ]);

    const statement = queryRawMock.mock.calls[0]?.[0];
    const sqlText = Array.isArray(statement?.strings) ? statement.strings.join(" ") : "";

    expect(sqlText).toContain("ce.country IS NULL");
    expect(sqlText).toContain("upper(ce.country)");
    expect(sqlText).toContain("INNER JOIN public.links l ON l.id = ce.link_id");
    expect(sqlText).toContain("l.user_id = CAST(");
  });
});
