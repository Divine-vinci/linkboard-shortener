import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, overviewMock, timeseriesMock, notFoundMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  overviewMock: vi.fn(),
  timeseriesMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("@/lib/auth/config", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db/analytics", () => ({
  getLinkAnalyticsOverview: overviewMock,
  getLinkClicksTimeseries: timeseriesMock,
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

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

import LinkAnalyticsPage from "@/app/(dashboard)/dashboard/links/[id]/analytics/page";

describe("src/app/(dashboard)/dashboard/links/[id]/analytics/page.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders owned analytics with all aggregation datasets loaded server-side", async () => {
    authMock.mockResolvedValue({ user: { id: "user-123" } });
    overviewMock.mockResolvedValue({
      id: "link-123",
      slug: "launch-docs",
      targetUrl: "https://example.com/docs",
      totalClicks: 7,
    });
    timeseriesMock
      .mockResolvedValueOnce([{ label: "2026-03-16", periodStart: "2026-03-16T00:00:00.000Z", clicks: 2 }])
      .mockResolvedValueOnce([{ label: "2026-W12", periodStart: "2026-03-16T00:00:00.000Z", clicks: 7 }])
      .mockResolvedValueOnce([{ label: "2026-03", periodStart: "2026-03-01T00:00:00.000Z", clicks: 7 }]);

    render(await LinkAnalyticsPage({ params: Promise.resolve({ id: "link-123" }) }));

    expect(overviewMock).toHaveBeenCalledWith("user-123", "link-123");
    expect(timeseriesMock).toHaveBeenNthCalledWith(1, "user-123", "link-123", "daily");
    expect(timeseriesMock).toHaveBeenNthCalledWith(2, "user-123", "link-123", "weekly");
    expect(timeseriesMock).toHaveBeenNthCalledWith(3, "user-123", "link-123", "monthly");
    expect(screen.getByRole("heading", { name: "Link analytics" })).toBeInTheDocument();
    expect(screen.getByText("/launch-docs")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("renders the explicit empty state copy for links without clicks", async () => {
    authMock.mockResolvedValue({ user: { id: "user-123" } });
    overviewMock.mockResolvedValue({
      id: "link-123",
      slug: "empty-link",
      targetUrl: "https://example.com/empty",
      totalClicks: 0,
    });
    timeseriesMock.mockResolvedValue([]);

    render(await LinkAnalyticsPage({ params: Promise.resolve({ id: "link-123" }) }));

    expect(screen.getByText("No clicks yet")).toBeInTheDocument();
  });

  it("calls notFound when the session is missing", async () => {
    authMock.mockResolvedValue(null);

    await expect(LinkAnalyticsPage({ params: Promise.resolve({ id: "link-123" }) })).rejects.toThrow("NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
    expect(overviewMock).not.toHaveBeenCalled();
  });

  it("uses the existing not-found pattern for missing or unauthorized links", async () => {
    authMock.mockResolvedValue({ user: { id: "user-123" } });
    overviewMock.mockResolvedValue(null);

    await expect(LinkAnalyticsPage({ params: Promise.resolve({ id: "link-404" }) })).rejects.toThrow("NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });
});
