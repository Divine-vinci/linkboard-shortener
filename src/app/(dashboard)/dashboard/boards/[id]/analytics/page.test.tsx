import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  findBoardSummaryByIdMock,
  overviewMock,
  timeseriesMock,
  referrerMock,
  geoMock,
  notFoundMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  findBoardSummaryByIdMock: vi.fn(),
  overviewMock: vi.fn(),
  timeseriesMock: vi.fn(),
  referrerMock: vi.fn(),
  geoMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("@/lib/auth/config", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db/boards", () => ({
  findBoardSummaryById: findBoardSummaryByIdMock,
}));

vi.mock("@/lib/db/analytics", () => ({
  getBoardAnalyticsOverview: overviewMock,
  getBoardClicksTimeseries: timeseriesMock,
  getBoardReferrerBreakdown: referrerMock,
  getBoardGeoBreakdown: geoMock,
}));

vi.mock("@/components/analytics/board-analytics-header", () => ({
  BoardAnalyticsHeader: ({ boardName, totalClicks, linkCount }: { boardName: string; totalClicks: number; linkCount: number }) => (
    <div data-testid="board-header">{boardName}:{totalClicks}:{linkCount}</div>
  ),
}));

vi.mock("@/components/analytics/board-links-table", () => ({
  BoardLinksTable: ({ links, totalClicks }: { links: Array<{ slug: string; clicks: number }>; totalClicks: number }) => (
    <div data-testid="board-links-table">{links.length}:{totalClicks}:{links[0]?.slug ?? "empty"}</div>
  ),
}));

vi.mock("@/components/analytics/clicks-timeseries-chart", () => ({
  ClicksTimeseriesChart: ({ datasets }: { datasets: Record<string, unknown[]> }) => {
    const allPoints = Object.values(datasets).flat();
    return (
      <div data-testid="timeseries-chart">
        {Object.keys(datasets).join(",")}
        {allPoints.length === 0 ? <span>No clicks yet</span> : null}
      </div>
    );
  },
}));

vi.mock("@/components/analytics/referrer-chart", () => ({
  ReferrerChart: ({ data }: { data: Array<{ domain: string; clicks: number }> }) => (
    <div data-testid="referrer-chart">{data.length === 0 ? "No referrer data yet" : data[0]?.domain}</div>
  ),
}));

vi.mock("@/components/analytics/geo-chart", () => ({
  GeoChart: ({ data }: { data: Array<{ country: string; clicks: number }> }) => (
    <div data-testid="geo-chart">{data.length === 0 ? "No geographic data yet" : data[0]?.country}</div>
  ),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

import BoardAnalyticsPage from "@/app/(dashboard)/dashboard/boards/[id]/analytics/page";

describe("src/app/(dashboard)/dashboard/boards/[id]/analytics/page.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders owned board analytics with all aggregate datasets loaded", async () => {
    authMock.mockResolvedValue({ user: { id: "user-123" } });
    findBoardSummaryByIdMock.mockResolvedValue({ id: "board-123", userId: "user-123" });
    overviewMock.mockResolvedValue({
      boardName: "Launch board",
      totalClicks: 10,
      linkCount: 2,
      topLinks: [{ id: "link-1", slug: "launch-docs", title: "Docs", clicks: 7 }],
    });
    timeseriesMock
      .mockResolvedValueOnce([{ label: "2026-03-16", periodStart: "2026-03-16T00:00:00.000Z", clicks: 2 }])
      .mockResolvedValueOnce([{ label: "2026-W12", periodStart: "2026-03-16T00:00:00.000Z", clicks: 7 }])
      .mockResolvedValueOnce([{ label: "2026-03", periodStart: "2026-03-01T00:00:00.000Z", clicks: 10 }]);
    referrerMock.mockResolvedValue([{ domain: "twitter.com", clicks: 5 }]);
    geoMock.mockResolvedValue([{ country: "US", clicks: 4 }]);

    render(await BoardAnalyticsPage({ params: Promise.resolve({ id: "board-123" }) }));

    expect(findBoardSummaryByIdMock).toHaveBeenCalledWith("board-123");
    expect(overviewMock).toHaveBeenCalledWith("user-123", "board-123");
    expect(timeseriesMock).toHaveBeenNthCalledWith(1, "user-123", "board-123", "daily");
    expect(timeseriesMock).toHaveBeenNthCalledWith(2, "user-123", "board-123", "weekly");
    expect(timeseriesMock).toHaveBeenNthCalledWith(3, "user-123", "board-123", "monthly");
    expect(referrerMock).toHaveBeenCalledWith("user-123", "board-123");
    expect(geoMock).toHaveBeenCalledWith("user-123", "board-123");
    expect(screen.getByTestId("board-header")).toHaveTextContent("Launch board:10:2");
    expect(screen.getByTestId("board-links-table")).toHaveTextContent("1:10:launch-docs");
    expect(screen.getByText("twitter.com")).toBeInTheDocument();
    expect(screen.getByText("US")).toBeInTheDocument();
  });

  it("renders explicit empty states for empty or unclicked boards", async () => {
    authMock.mockResolvedValue({ user: { id: "user-123" } });
    findBoardSummaryByIdMock.mockResolvedValue({ id: "board-123", userId: "user-123" });
    overviewMock.mockResolvedValue({
      boardName: "Empty board",
      totalClicks: 0,
      linkCount: 0,
      topLinks: [],
    });
    timeseriesMock.mockResolvedValue([]);
    referrerMock.mockResolvedValue([]);
    geoMock.mockResolvedValue([]);

    render(await BoardAnalyticsPage({ params: Promise.resolve({ id: "board-123" }) }));

    expect(screen.getByText("No clicks yet")).toBeInTheDocument();
    expect(screen.getByText("No referrer data yet")).toBeInTheDocument();
    expect(screen.getByText("No geographic data yet")).toBeInTheDocument();
    expect(screen.getByTestId("board-links-table")).toHaveTextContent("0:0:empty");
  });

  it("calls notFound when the session is missing", async () => {
    authMock.mockResolvedValue(null);

    await expect(BoardAnalyticsPage({ params: Promise.resolve({ id: "board-123" }) })).rejects.toThrow("NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
    expect(findBoardSummaryByIdMock).not.toHaveBeenCalled();
  });

  it("calls notFound when the board does not belong to the signed-in user", async () => {
    authMock.mockResolvedValue({ user: { id: "user-123" } });
    findBoardSummaryByIdMock.mockResolvedValue({ id: "board-123", userId: "user-999" });

    await expect(BoardAnalyticsPage({ params: Promise.resolve({ id: "board-123" }) })).rejects.toThrow("NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
    expect(overviewMock).not.toHaveBeenCalled();
  });
});
