import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children, data }: { children: React.ReactNode; data: Array<{ label: string; clicks: number }> }) => (
    <div data-testid="line-chart" data-points={data.length}>{children}</div>
  ),
  CartesianGrid: () => <div data-testid="grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Line: () => <div data-testid="line" />,
}));

import { ClicksTimeseriesChart } from "@/components/analytics/clicks-timeseries-chart";

const datasets = {
  daily: [
    { label: "2026-03-16", periodStart: "2026-03-16T00:00:00.000Z", clicks: 2 },
    { label: "2026-03-17", periodStart: "2026-03-17T00:00:00.000Z", clicks: 5 },
  ],
  weekly: [{ label: "2026-W12", periodStart: "2026-03-16T00:00:00.000Z", clicks: 7 }],
  monthly: [{ label: "2026-03", periodStart: "2026-03-01T00:00:00.000Z", clicks: 7 }],
};

describe("src/components/analytics/clicks-timeseries-chart.tsx", () => {
  it("renders the initial dataset and accessible summary text", () => {
    render(<ClicksTimeseriesChart datasets={datasets} initialGranularity="daily" />);

    expect(screen.getByRole("button", { name: "Daily" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Showing 7 total clicks across 2 daily buckets from 2026-03-16 to 2026-03-17."))
      .toBeInTheDocument();
    expect(screen.getByTestId("line-chart")).toHaveAttribute("data-points", "2");
  });

  it("switches datasets when a different aggregation is selected", () => {
    render(<ClicksTimeseriesChart datasets={datasets} initialGranularity="daily" />);

    fireEvent.click(screen.getByRole("button", { name: "Weekly" }));

    expect(screen.getByRole("button", { name: "Weekly" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Showing 7 total clicks across 1 weekly bucket from 2026-W12 to 2026-W12."))
      .toBeInTheDocument();
    expect(screen.getByTestId("line-chart")).toHaveAttribute("data-points", "1");
  });

  it("renders a zero-state that does not rely on visuals alone", () => {
    render(
      <ClicksTimeseriesChart
        datasets={{ daily: [], weekly: [], monthly: [] }}
        initialGranularity="daily"
      />,
    );

    expect(screen.getByText("No clicks yet")).toBeInTheDocument();
    expect(screen.getByText("No clicks have been recorded for this link yet. The chart will populate once visits arrive."))
      .toBeInTheDocument();
    expect(screen.getByText("No click data is available for the selected daily range."))
      .toBeInTheDocument();
  });
});
