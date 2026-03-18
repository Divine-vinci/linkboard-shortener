import { BoardVisibility } from "@prisma/client";
import { render, screen } from "@testing-library/react";

import { BoardsOverview } from "@/components/dashboard/boards-overview";

describe("src/components/dashboard/boards-overview.tsx", () => {
  it("renders boards with visibility badges and link counts", () => {
    render(
      <BoardsOverview
        boards={[
          {
            id: "board-1",
            name: "Launch",
            visibility: BoardVisibility.Public,
            _count: { boardLinks: 4 },
          },
          {
            id: "board-2",
            name: "Internal",
            visibility: BoardVisibility.Private,
            _count: { boardLinks: 1 },
          },
        ]}
      />,
    );

    expect(screen.getByText("Launch")).toBeInTheDocument();
    expect(screen.getByText("Internal")).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.getByText("Private")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view all/i })).toHaveAttribute("href", "/dashboard/boards");
  });

  it("renders an empty state when there are no boards", () => {
    render(<BoardsOverview boards={[]} />);

    expect(screen.getByText("No boards yet")).toBeInTheDocument();
    expect(screen.getByText(/create a board to group links/i)).toBeInTheDocument();
  });
});
