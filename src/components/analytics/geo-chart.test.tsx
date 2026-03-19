import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children, data }: { children: React.ReactNode; data: Array<{ label: string; clicks: number }> }) => (
    <div data-testid="bar-chart" data-points={data.length}>{children}</div>
  ),
  CartesianGrid: () => <div data-testid="grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Bar: ({ children }: { children: React.ReactNode }) => <div data-testid="bar">{children}</div>,
  Cell: () => <div data-testid="cell" />,
  LabelList: () => <div data-testid="label-list" />,
}));

import { GeoChart } from "@/components/analytics/geo-chart";

describe("src/components/analytics/geo-chart.tsx", () => {
  it("renders country labels, counts, and accessible summary", () => {
    render(
      <GeoChart
        data={[
          { country: "US", clicks: 6 },
          { country: "NG", clicks: 2 },
        ]}
      />,
    );

    expect(screen.getByRole("region", { name: "Geographic analytics" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Country distribution" })).toBeInTheDocument();
    expect(screen.getByText("2 countries totalling 8 clicks. United States (US): 6, Nigeria (NG): 2.")).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toHaveAttribute("data-points", "2");
  });

  it("renders an explicit zero-state when no geographic data exists", () => {
    render(<GeoChart data={[]} />);

    expect(screen.getByText("No geographic data yet")).toBeInTheDocument();
    expect(screen.getByText("Country distribution will appear here once visits include geo metadata.")).toBeInTheDocument();
    expect(screen.getByText("No geographic data is available yet for this link.")).toBeInTheDocument();
  });
});
