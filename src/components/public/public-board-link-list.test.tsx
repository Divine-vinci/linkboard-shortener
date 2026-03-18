import { render, screen } from "@testing-library/react";

import { PublicBoardLinkList } from "@/components/public/public-board-link-list";

describe("src/components/public/public-board-link-list.tsx", () => {
  it("renders ordered board links with short-url hrefs and external link behavior", () => {
    render(
      <PublicBoardLinkList
        links={[
          {
            id: "board-link-1",
            position: 0,
            link: {
              slug: "creator-kit",
              title: "Creator Kit",
              description: "Docs and launch checklist",
              targetUrl: "https://docs.example.com/creator-kit",
            },
          },
        ]}
      />,
    );

    const link = screen.getByRole("link", { name: /creator kit/i });

    expect(link).toHaveAttribute("href", "/creator-kit");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveClass("min-h-11", "p-4", "sm:p-5", "focus:ring-2", "focus:ring-emerald-400/40");
    expect(screen.getByText("docs.example.com")).toHaveClass("break-all");
    expect(screen.getByText("Docs and launch checklist")).toBeInTheDocument();
  });

  it("renders an empty state when there are no links", () => {
    render(<PublicBoardLinkList links={[]} />);

    expect(screen.getByText("This board has no links yet.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("displays position numbers starting from 1", () => {
    render(
      <PublicBoardLinkList
        links={[
          {
            id: "bl-1",
            position: 0,
            link: { slug: "first", title: "First Link", description: null, targetUrl: "https://a.com" },
          },
          {
            id: "bl-2",
            position: 1,
            link: { slug: "second", title: "Second Link", description: null, targetUrl: "https://b.com" },
          },
        ]}
      />,
    );

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/first");
    expect(links[1]).toHaveAttribute("href", "/second");
  });

  it("falls back to the slug when the title is missing", () => {
    render(
      <PublicBoardLinkList
        links={[
          {
            id: "board-link-1",
            position: 0,
            link: {
              slug: "creator-kit",
              title: null,
              description: null,
              targetUrl: "not a valid url",
            },
          },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: /creator-kit/i })).toBeInTheDocument();
    expect(screen.getByText("not a valid url")).toBeInTheDocument();
  });

  it("keeps a single-column mobile layout with wrapped long content", () => {
    render(
      <PublicBoardLinkList
        links={[
          {
            id: "board-link-1",
            position: 0,
            link: {
              slug: "very-long-slug-used-as-a-fallback-title",
              title: "A Very Long Link Title That Should Wrap On Mobile Without Breaking The Card Layout",
              description:
                "A long description that should continue wrapping inside the card on narrow screens while preserving readable spacing.",
              targetUrl: "https://subdomain.example.com/really/long/path/that/should/still/wrap/neatly",
            },
          },
        ]}
      />,
    );

    expect(screen.getByRole("list", { name: "Board links" })).toHaveClass("space-y-3", "sm:space-y-4");
    expect(screen.getByRole("link", { name: /A Very Long Link Title/i })).toHaveClass("min-h-11", "group", "block");
    expect(screen.getByRole("heading", { level: 2, name: /A Very Long Link Title/i })).toHaveClass("min-w-0", "break-words", "text-base", "sm:text-lg");
    expect(screen.getByText(/A long description/)).toHaveClass("break-words");
    expect(screen.getByText("subdomain.example.com")).toHaveClass("break-all");
  });
});
