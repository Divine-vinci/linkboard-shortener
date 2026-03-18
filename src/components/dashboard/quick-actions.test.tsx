import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/links/create-link-form", () => ({
  CreateLinkForm: ({ boards }: { boards?: Array<{ id: string; name: string }> }) => (
    <div data-testid="create-link-form">boards:{boards?.map((board) => board.name).join(",")}</div>
  ),
}));

import { QuickActions } from "@/components/dashboard/quick-actions";

describe("src/components/dashboard/quick-actions.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders quick action links", () => {
    render(<QuickActions boards={[]} />);

    expect(screen.getByRole("button", { name: "Create Link" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create Board" })).toHaveAttribute("href", "/dashboard/boards/new");
  });

  it("toggles the inline create link form and passes board options", () => {
    render(
      <QuickActions
        boards={[
          { id: "board-1", name: "Launch" },
          { id: "board-2", name: "Ops" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create Link" }));
    expect(screen.getByTestId("create-link-form")).toHaveTextContent("boards:Launch,Ops");

    fireEvent.click(screen.getByRole("button", { name: "Create Link" }));
    expect(screen.queryByTestId("create-link-form")).not.toBeInTheDocument();
  });
});
