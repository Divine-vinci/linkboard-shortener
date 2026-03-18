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

import { LinkPagination } from "@/components/links/link-pagination";

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
});
