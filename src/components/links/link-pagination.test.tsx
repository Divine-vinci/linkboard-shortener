import type { AnchorHTMLAttributes } from "react";

import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

const { searchParamsValue } = vi.hoisted(() => ({
  searchParamsValue: new URLSearchParams("q=docs&tag=launch"),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParamsValue,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { LinkPagination, getPageNumbers } from "@/components/links/link-pagination";

describe("src/components/links/link-pagination.tsx", () => {
  it("renders page links with the current page highlighted", () => {
    render(<LinkPagination currentPage={2} totalPages={4} />);

    expect(screen.getByRole("link", { name: "1" })).toHaveAttribute("href", "?q=docs&tag=launch");
    expect(screen.getByRole("link", { name: "2" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "3" })).toHaveAttribute("href", "?q=docs&tag=launch&page=3");
  });

  it("hides pagination when there is only one page", () => {
    const { container } = render(<LinkPagination currentPage={1} totalPages={1} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("truncates page numbers with ellipsis when totalPages > 7", () => {
    render(<LinkPagination currentPage={5} totalPages={10} />);

    // Should show: 1 ... 4 5 6 ... 10
    expect(screen.getByRole("link", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "4" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "5" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "6" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "10" })).toBeInTheDocument();

    // Should NOT render pages 2, 3, 7, 8, 9 as links
    expect(screen.queryByRole("link", { name: "2" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "3" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "7" })).not.toBeInTheDocument();

    // Should render two ellipsis spans
    const ellipses = screen.getAllByText("...");
    expect(ellipses).toHaveLength(2);
  });

  describe("getPageNumbers", () => {
    it("returns all pages when totalPages <= 7", () => {
      expect(getPageNumbers(3, 5)).toEqual([1, 2, 3, 4, 5]);
    });

    it("returns correct pattern for middle page", () => {
      // page 5 of 10 => 1 ... 4 5 6 ... 10
      expect(getPageNumbers(5, 10)).toEqual([1, "ellipsis-start", 4, 5, 6, "ellipsis-end", 10]);
    });

    it("returns correct pattern for first page", () => {
      // page 1 of 10 => 1 2 ... 10
      expect(getPageNumbers(1, 10)).toEqual([1, 2, "ellipsis-end", 10]);
    });

    it("returns correct pattern for last page", () => {
      // page 10 of 10 => 1 ... 9 10
      expect(getPageNumbers(10, 10)).toEqual([1, "ellipsis-start", 9, 10]);
    });

    it("omits start ellipsis when window is adjacent to first page", () => {
      // page 3 of 10 => 1 2 3 4 ... 10
      expect(getPageNumbers(3, 10)).toEqual([1, 2, 3, 4, "ellipsis-end", 10]);
    });

    it("omits end ellipsis when window is adjacent to last page", () => {
      // page 8 of 10 => 1 ... 7 8 9 10
      expect(getPageNumbers(8, 10)).toEqual([1, "ellipsis-start", 7, 8, 9, 10]);
    });
  });
});
