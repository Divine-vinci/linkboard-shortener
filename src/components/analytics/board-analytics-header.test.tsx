import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BoardAnalyticsHeader } from "@/components/analytics/board-analytics-header";

describe("src/components/analytics/board-analytics-header.tsx", () => {
  it("renders board context with aggregate KPIs", () => {
    render(
      <BoardAnalyticsHeader
        boardName="Launch board"
        totalClicks={12}
        linkCount={3}
      />,
    );

    expect(screen.getByRole("heading", { name: "Board analytics" })).toBeInTheDocument();
    expect(screen.getByText("Launch board")).toBeInTheDocument();
    expect(screen.getByText("Total clicks")).toBeInTheDocument();
    expect(screen.getByText("Links in board")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders the empty-board zero state", () => {
    render(
      <BoardAnalyticsHeader
        boardName="Empty board"
        totalClicks={0}
        linkCount={0}
      />,
    );

    expect(screen.getByText("No links in this board")).toBeInTheDocument();
  });

  it("renders the no-clicks zero state when links exist", () => {
    render(
      <BoardAnalyticsHeader
        boardName="Quiet board"
        totalClicks={0}
        linkCount={2}
      />,
    );

    expect(screen.getByText("No clicks yet")).toBeInTheDocument();
  });
});
