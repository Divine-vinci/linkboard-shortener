import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/links/create-link-form", () => ({
  CreateLinkForm: ({ boards }: { boards?: Array<{ id: string; name: string }> }) => (
    <div data-testid="create-link-form">boards:{boards?.map((board) => board.name).join(",")}</div>
  ),
}));

import { EmptyState } from "@/components/dashboard/empty-state";

describe("src/components/dashboard/empty-state.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders onboarding guidance and CTAs", () => {
    render(<EmptyState boards={[]} />);

    expect(screen.getByText("Your dashboard is ready")).toBeInTheDocument();
    expect(screen.getByText(/create your first board and start adding links/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Link" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create Board" })).toHaveAttribute("href", "/dashboard/boards/new");
  });

  it("opens the inline create link form", () => {
    render(<EmptyState boards={[{ id: "board-1", name: "Launch" }]} />);

    fireEvent.click(screen.getByRole("button", { name: "Create Link" }));

    expect(screen.getByTestId("create-link-form")).toHaveTextContent("boards:Launch");
  });
});
