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

const { getLinkAnalyticsOverview, getLinkClicksTimeseries } = await import("./analytics");

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
});
