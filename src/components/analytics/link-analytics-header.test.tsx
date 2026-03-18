import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LinkAnalyticsHeader } from "@/components/analytics/link-analytics-header";

describe("src/components/analytics/link-analytics-header.tsx", () => {
  it("renders link context and the total clicks KPI", () => {
    render(
      <LinkAnalyticsHeader
        slug="launch-docs"
        targetUrl="https://example.com/docs"
        totalClicks={12}
      />,
    );

    expect(screen.getByText("/launch-docs")).toBeInTheDocument();
    expect(screen.getByText("https://example.com/docs")).toBeInTheDocument();
    expect(screen.getByText("Total clicks")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });
});
