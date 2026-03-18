import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

import { BoardForm } from "@/components/boards/board-form";

describe("src/components/boards/board-form.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders all fields with private selected by default", () => {
    render(<BoardForm />);

    expect(screen.getByLabelText(/board name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/private/i)).toBeChecked();
    expect(screen.getByLabelText(/public/i)).not.toBeChecked();
    expect(screen.getByLabelText(/unlisted/i)).not.toBeChecked();
  });

  it("shows validation errors and does not submit without a name", async () => {
    render(<BoardForm />);

    fireEvent.change(screen.getByLabelText(/board name/i), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /create board/i }));

    expect(await screen.findByText("Board name is required")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("submits valid input and redirects to the new board", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: "board-123",
          name: "Ideas",
          slug: "ideas",
          description: "Product notes",
          visibility: "Public",
          userId: "user-123",
          createdAt: "2026-03-18T02:00:00.000Z",
          updatedAt: "2026-03-18T02:00:00.000Z",
        },
      }),
    } as Response);

    render(<BoardForm />);

    fireEvent.change(screen.getByLabelText(/board name/i), { target: { value: "Ideas" } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "Product notes" } });
    fireEvent.click(screen.getByLabelText(/public/i));
    fireEvent.click(screen.getByRole("button", { name: /create board/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/v1/boards",
        expect.objectContaining({
          body: JSON.stringify({
            name: "Ideas",
            description: "Product notes",
            visibility: "Public",
          }),
        }),
      );
    });
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/dashboard/boards/board-123");
    });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows server-side validation errors", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({
        error: {
          message: "Invalid board input",
          details: {
            fields: {
              name: "Board name must be at most 100 characters",
            },
          },
        },
      }),
    } as Response);

    render(<BoardForm />);

    fireEvent.change(screen.getByLabelText(/board name/i), { target: { value: "Ideas" } });
    fireEvent.click(screen.getByRole("button", { name: /create board/i }));

    expect(await screen.findByText("Board name must be at most 100 characters")).toBeInTheDocument();
  });
});
