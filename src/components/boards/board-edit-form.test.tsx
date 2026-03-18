import { BoardVisibility } from "@prisma/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

import { BoardEditForm } from "@/components/boards/board-edit-form";

const board = {
  id: "board-123",
  name: "Ideas",
  slug: "ideas",
  description: "Product notes",
  visibility: BoardVisibility.Public,
};

describe("src/components/boards/board-edit-form.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders pre-populated fields", () => {
    render(<BoardEditForm board={board} />);

    expect(screen.getByDisplayValue("Ideas")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Product notes")).toBeInTheDocument();
    expect(screen.getByLabelText(/public/i)).toBeChecked();
  });

  it("shows validation errors and does not submit an empty name", async () => {
    render(<BoardEditForm board={board} />);

    fireEvent.change(screen.getByLabelText(/board name/i), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText("Board name is required")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("submits changed values and redirects back to the board detail page", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: "board-123",
          name: "Renamed board",
          slug: "ideas",
          description: "Updated notes",
          visibility: BoardVisibility.Private,
          userId: "user-123",
          createdAt: "2026-03-18T02:00:00.000Z",
          updatedAt: "2026-03-18T02:00:00.000Z",
        },
      }),
    } as Response);

    render(<BoardEditForm board={board} />);

    fireEvent.change(screen.getByLabelText(/board name/i), { target: { value: "Renamed board" } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "Updated notes" } });
    fireEvent.click(screen.getByLabelText(/private/i));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/v1/boards/board-123",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            name: "Renamed board",
            description: "Updated notes",
            visibility: BoardVisibility.Private,
          }),
        }),
      );
    });
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/dashboard/boards/board-123?updated=1");
    });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("sends null when clearing the description", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { ...board, description: null } }),
    } as Response);

    render(<BoardEditForm board={board} />);

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/v1/boards/board-123",
        expect.objectContaining({
          body: JSON.stringify({
            name: "Ideas",
            description: null,
            visibility: BoardVisibility.Public,
          }),
        }),
      );
    });
  });
});
