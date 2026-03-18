import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children, data }: { children: React.ReactNode; data: Array<{ domain: string; clicks: number }> }) => (
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

import { ReferrerChart } from "@/components/analytics/referrer-chart";

describe("src/components/analytics/referrer-chart.tsx", () => {
  it("renders grouped domains, counts, and text summary", () => {
    render(
      <ReferrerChart
        data={[
          { domain: "twitter.com", clicks: 8 },
          { domain: "google.com", clicks: 3 },
        ]}
      />,
    );

    expect(screen.getByRole("region", { name: "Referrer analytics" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Top traffic sources" })).toBeInTheDocument();
    expect(screen.getByText("Top referrer: twitter.com with 8 clicks out of 11 total.")).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toHaveAttribute("data-points", "2");
  });

  it("renders an explicit zero-state when no referrer data exists", () => {
    render(<ReferrerChart data={[]} />);

    expect(screen.getByText("No referrer data yet")).toBeInTheDocument();
    expect(screen.getByText("Referrer domains will appear here after visitors arrive from external sources.")).toBeInTheDocument();
    expect(screen.getByText("No referrer data is available yet for this link.")).toBeInTheDocument();
  });
});
