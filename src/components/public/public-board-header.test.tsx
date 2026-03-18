import { render, screen } from "@testing-library/react";

import { PublicBoardHeader } from "@/components/public/public-board-header";

describe("src/components/public/public-board-header.tsx", () => {
  it("renders the board heading, description, count, and powered by link", () => {
    render(
      <PublicBoardHeader
        board={{
          name: "Creator Kit",
          description: "Launch assets and references",
          slug: "creator-kit",
          _count: { boardLinks: 3 },
        }}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Creator Kit" })).toBeInTheDocument();
    expect(screen.getByText("Launch assets and references")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("/b/creator-kit")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Powered by Linkboard" })).toHaveAttribute("href", "/");
  });

  it("renders fallback copy when description is missing", () => {
    render(
      <PublicBoardHeader
        board={{
          name: "Creator Kit",
          description: null,
          slug: "creator-kit",
          _count: { boardLinks: 0 },
        }}
      />,
    );

    expect(screen.getByText("A curated collection of links shared via Linkboard.")).toBeInTheDocument();
  });
});
