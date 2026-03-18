// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirstMock, boardFindFirstMock, queryRawMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  boardFindFirstMock: vi.fn(),
  queryRawMock: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    link: {
      findFirst: findFirstMock,
    },
    board: {
      findFirst: boardFindFirstMock,
    },
    $queryRaw: queryRawMock,
  },
}));

const {
  getBoardAnalyticsOverview,
  getBoardClicksTimeseries,
  getBoardGeoBreakdown,
  getBoardReferrerBreakdown,
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

  it("returns board overview scoped to the owner with per-link counts", async () => {
    boardFindFirstMock.mockResolvedValue({
      name: "Launch board",
      _count: {
        boardLinks: 2,
      },
    });
    queryRawMock.mockResolvedValue([
      { id: "link-1", slug: "launch-docs", title: "Docs", clicks: 9 },
      { id: "link-2", slug: "launch-demo", title: null, clicks: 3 },
    ]);

    await expect(getBoardAnalyticsOverview("user-123", "board-123")).resolves.toEqual({
      boardName: "Launch board",
      totalClicks: 12,
      linkCount: 2,
      topLinks: [
        { id: "link-1", slug: "launch-docs", title: "Docs", clicks: 9 },
        { id: "link-2", slug: "launch-demo", title: null, clicks: 3 },
      ],
    });

    expect(boardFindFirstMock).toHaveBeenCalledWith({
      where: {
        id: "board-123",
        userId: "user-123",
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

    const statement = queryRawMock.mock.calls[0]?.[0];
    const sqlText = Array.isArray(statement?.strings) ? statement.strings.join(" ") : "";

    expect(sqlText).toContain("INNER JOIN public.board_links bl ON bl.link_id = l.id");
    expect(sqlText).toContain("INNER JOIN public.boards b ON b.id = bl.board_id");
    expect(sqlText).toContain("LEFT JOIN public.click_events ce ON ce.link_id = l.id");
    expect(sqlText).toContain("b.user_id = CAST(");
    expect(sqlText).toContain("ORDER BY clicks DESC, l.slug ASC");
  });

  it("returns null when the board is not owned by the user", async () => {
    boardFindFirstMock.mockResolvedValue(null);

    await expect(getBoardAnalyticsOverview("user-123", "board-404")).resolves.toBeNull();
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it("returns zero-state payloads for boards without links or clicks", async () => {
    boardFindFirstMock.mockResolvedValue({
      name: "Empty board",
      _count: {
        boardLinks: 0,
      },
    });
    queryRawMock.mockResolvedValue([]);

    await expect(getBoardAnalyticsOverview("user-123", "board-123")).resolves.toEqual({
      boardName: "Empty board",
      totalClicks: 0,
      linkCount: 0,
      topLinks: [],
    });
    await expect(getBoardClicksTimeseries("user-123", "board-123", "daily")).resolves.toEqual([]);
    await expect(getBoardReferrerBreakdown("user-123", "board-123")).resolves.toEqual([]);
    await expect(getBoardGeoBreakdown("user-123", "board-123")).resolves.toEqual([]);
  });

  it("returns board click timeseries with the shared bucket formatter", async () => {
    queryRawMock.mockResolvedValue([{ period: new Date("2026-03-16T00:00:00.000Z"), clicks: 7 }]);

    await expect(getBoardClicksTimeseries("user-123", "board-123", "weekly")).resolves.toEqual([
      {
        label: "2026-W12",
        periodStart: "2026-03-16T00:00:00.000Z",
        clicks: 7,
      },
    ]);

    const statement = queryRawMock.mock.calls[0]?.[0];
    const sqlText = Array.isArray(statement?.strings) ? statement.strings.join(" ") : "";

    expect(sqlText).toContain("date_trunc(");
    expect(sqlText).toContain("INNER JOIN public.board_links bl ON bl.link_id = ce.link_id");
    expect(sqlText).toContain("INNER JOIN public.boards b ON b.id = bl.board_id");
    expect(sqlText).toContain("b.user_id = CAST(");
  });

  it("returns board referrer breakdown aggregated across board links", async () => {
    queryRawMock.mockResolvedValue([
      { domain: "twitter.com", clicks: 8 },
      { domain: "Direct / Unknown", clicks: 3 },
    ]);

    await expect(getBoardReferrerBreakdown("user-123", "board-123")).resolves.toEqual([
      { domain: "twitter.com", clicks: 8 },
      { domain: "Direct / Unknown", clicks: 3 },
    ]);

    const statement = queryRawMock.mock.calls[0]?.[0];
    const sqlText = Array.isArray(statement?.strings) ? statement.strings.join(" ") : "";

    expect(sqlText).toContain("regexp_replace(ce.referrer,");
    expect(sqlText).toContain("INNER JOIN public.board_links bl ON bl.link_id = ce.link_id");
    expect(sqlText).toContain("INNER JOIN public.boards b ON b.id = bl.board_id");
    expect(sqlText).toContain("LIMIT 10");
  });

  it("returns board geographic breakdown with ownership filtering", async () => {
    queryRawMock.mockResolvedValue([
      { country: "US", clicks: 6 },
      { country: "Unknown", clicks: 2 },
    ]);

    await expect(getBoardGeoBreakdown("user-123", "board-123")).resolves.toEqual([
      { country: "US", clicks: 6 },
      { country: "Unknown", clicks: 2 },
    ]);

    const statement = queryRawMock.mock.calls[0]?.[0];
    const sqlText = Array.isArray(statement?.strings) ? statement.strings.join(" ") : "";

    expect(sqlText).toContain("ce.country IS NULL");
    expect(sqlText).toContain("INNER JOIN public.board_links bl ON bl.link_id = ce.link_id");
    expect(sqlText).toContain("INNER JOIN public.boards b ON b.id = bl.board_id");
    expect(sqlText).toContain("b.user_id = CAST(");
  });
});
