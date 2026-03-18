import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BoardLinksTable } from "@/components/analytics/board-links-table";

describe("src/components/analytics/board-links-table.tsx", () => {
  it("renders per-link click counts and percentages", () => {
    render(
      <BoardLinksTable
        totalClicks={10}
        links={[
          { id: "link-1", slug: "launch-docs", title: "Docs", clicks: 7 },
          { id: "link-2", slug: "launch-demo", title: null, clicks: 3 },
        ]}
      />,
    );

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(screen.getByRole("table", { name: "Per-link click comparison for this board" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Slug" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Share" })).toBeInTheDocument();
    expect(within(rows[1]!).getByText("/launch-docs")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("Docs")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("7")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("70%")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("Untitled link")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("30%")).toBeInTheDocument();
  });

  it("renders the empty state when no board links exist", () => {
    render(<BoardLinksTable totalClicks={0} links={[]} />);

    expect(screen.getByText("No links in this board yet")).toBeInTheDocument();
  });
});
