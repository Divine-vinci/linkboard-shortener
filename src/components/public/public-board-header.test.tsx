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

  it("uses mobile-friendly wrapping and touch target classes", () => {
    render(
      <PublicBoardHeader
        board={{
          name: "An Extremely Long Board Name That Should Wrap Cleanly On Small Screens Without Horizontal Overflow",
          description:
            "A long description that should keep wrapping on narrow screens without clipping while preserving readable spacing and semantics.",
          slug: "creator-kit-with-a-very-long-slug-for-mobile-layout-testing",
          _count: { boardLinks: 12 },
        }}
      />,
    );

    expect(screen.getByRole("banner")).toHaveClass("p-4", "sm:p-8");
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass("break-words", "text-balance", "text-2xl", "sm:text-4xl");
    expect(screen.getByText(/A long description/)).toHaveClass("break-words", "text-zinc-300");
    expect(screen.getByText(/\/b\/creator-kit-with-a-very-long-slug/)).toHaveClass("break-all");
    expect(screen.getByRole("link", { name: "Powered by Linkboard" })).toHaveClass("min-h-11", "w-full", "justify-center", "sm:w-fit");
  });
});
