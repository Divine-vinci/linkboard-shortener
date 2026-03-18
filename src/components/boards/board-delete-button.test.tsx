import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

import { BoardDeleteButton } from "@/components/boards/board-delete-button";

describe("src/components/boards/board-delete-button.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("reveals inline confirmation before deleting", () => {
    render(<BoardDeleteButton boardId="board-123" />);

    fireEvent.click(screen.getByRole("button", { name: /delete board/i }));

    expect(screen.getByText(/this permanently deletes the board/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /yes, delete board/i })).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("deletes the board and redirects to the board list", async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: true, text: async () => "" } as Response);

    render(<BoardDeleteButton boardId="board-123" />);

    fireEvent.click(screen.getByRole("button", { name: /delete board/i }));
    fireEvent.click(screen.getByRole("button", { name: /yes, delete board/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/v1/boards/board-123", {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      });
    });
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/dashboard/boards?deleted=1");
    });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows the API error and stays on the page when delete fails", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({
        error: {
          message: "Board not found",
        },
      }),
    } as Response);

    render(<BoardDeleteButton boardId="board-123" />);

    fireEvent.click(screen.getByRole("button", { name: /delete board/i }));
    fireEvent.click(screen.getByRole("button", { name: /yes, delete board/i }));

    expect(await screen.findByText("Board not found")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
