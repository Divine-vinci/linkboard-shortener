import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

const { push, searchParamsValue } = vi.hoisted(() => ({
  push: vi.fn(),
  searchParamsValue: new URLSearchParams("q=old&tag=docs&page=3"),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParamsValue,
}));

import { LinkFilters } from "@/components/links/link-filters";

describe("src/components/links/link-filters.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the current query and tags", () => {
    render(<LinkFilters availableTags={["docs", "launch"]} currentQuery="docs" currentTag="docs" total={2} />);

    expect(screen.getByLabelText("Search links")).toHaveValue("docs");
    expect(screen.getByLabelText("Tag filter")).toHaveValue("docs");
    expect(screen.getByText(/2 links matched\./i)).toBeInTheDocument();
  });

  it("updates the url on search submit and resets pagination", () => {
    render(<LinkFilters availableTags={["docs", "launch"]} currentQuery="old" currentTag="docs" total={4} />);

    fireEvent.change(screen.getByLabelText("Search links"), { target: { value: "launch" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(push).toHaveBeenCalledWith("?q=launch&tag=docs");
  });

  it("updates the url when the tag filter changes", () => {
    render(<LinkFilters availableTags={["docs", "launch"]} currentQuery="old" total={4} />);

    fireEvent.change(screen.getByLabelText("Tag filter"), { target: { value: "launch" } });

    expect(push).toHaveBeenCalledWith("?q=old&tag=launch");
  });
});
