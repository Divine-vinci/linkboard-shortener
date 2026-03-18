import { render, screen } from "@testing-library/react";

import { formatRelativeDate, RecentLinks } from "@/components/dashboard/recent-links";

describe("src/components/dashboard/recent-links.tsx", () => {
  it("renders recent links with title fallback, urls, dates, and click placeholders", () => {
    render(
      <RecentLinks
        links={[
          {
            id: "link-1",
            slug: "alpha",
            title: "Alpha link",
            targetUrl: "https://example.com/alpha",
            createdAt: new Date(Date.now() - 60_000),
          },
          {
            id: "link-2",
            slug: "beta-slug",
            title: null,
            targetUrl: "https://example.com/beta",
            createdAt: new Date(Date.now() - 86_400_000),
          },
        ]}
      />,
    );

    expect(screen.getByText("Alpha link")).toBeInTheDocument();
    expect(screen.getByText("beta-slug")).toBeInTheDocument();
    expect(screen.getByText("https://example.com/alpha")).toBeInTheDocument();
    expect(screen.getByText("https://example.com/beta")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /view all/i })).toHaveAttribute("href", "/dashboard/links");
  });

  it("renders relative dates for each link", () => {
    render(
      <RecentLinks
        links={[
          {
            id: "link-1",
            slug: "recent",
            title: "Recent",
            targetUrl: "https://example.com",
            createdAt: new Date(Date.now() - 60_000),
          },
        ]}
      />,
    );

    expect(screen.getByText(/Created 1m ago/)).toBeInTheDocument();
  });

  it("opens external links in a new tab", () => {
    render(
      <RecentLinks
        links={[
          {
            id: "link-1",
            slug: "ext",
            title: "External",
            targetUrl: "https://example.com/ext",
            createdAt: new Date(),
          },
        ]}
      />,
    );

    const anchor = screen.getByRole("link", { name: /external/i });
    expect(anchor).toHaveAttribute("target", "_blank");
    expect(anchor).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders an empty state when there are no recent links", () => {
    render(<RecentLinks links={[]} />);

    expect(screen.getByText("No recent links yet")).toBeInTheDocument();
    expect(screen.getByText(/create your first short link/i)).toBeInTheDocument();
  });
});

describe("formatRelativeDate", () => {
  it('returns "Just now" for dates less than a minute ago', () => {
    expect(formatRelativeDate(new Date())).toBe("Just now");
    expect(formatRelativeDate(new Date(Date.now() - 20_000))).toBe("Just now");
  });

  it("returns minutes for dates less than an hour ago", () => {
    expect(formatRelativeDate(new Date(Date.now() - 60_000))).toBe("1m ago");
    expect(formatRelativeDate(new Date(Date.now() - 30 * 60_000))).toBe("30m ago");
  });

  it("returns hours for dates less than a day ago", () => {
    expect(formatRelativeDate(new Date(Date.now() - 3_600_000))).toBe("1h ago");
    expect(formatRelativeDate(new Date(Date.now() - 12 * 3_600_000))).toBe("12h ago");
  });

  it("returns days for dates less than a week ago", () => {
    expect(formatRelativeDate(new Date(Date.now() - 86_400_000))).toBe("1d ago");
    expect(formatRelativeDate(new Date(Date.now() - 5 * 86_400_000))).toBe("5d ago");
  });

  it("returns a formatted date for dates a week or older", () => {
    const oldDate = new Date(Date.now() - 14 * 86_400_000);
    const result = formatRelativeDate(oldDate);
    expect(result).not.toContain("ago");
    expect(result).toMatch(/[A-Z][a-z]{2} \d{1,2}/);
  });
});
