import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProfileForm } from "@/components/settings/profile-form";

describe("src/components/settings/profile-form.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders fetched profile data", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: "user-123",
          name: "Vinci",
          email: "vinci@example.com",
          image: null,
          createdAt: "2026-03-17T12:00:00.000Z",
        },
      }),
    } as Response);

    render(<ProfileForm />);

    expect(await screen.findByDisplayValue("Vinci")).toBeInTheDocument();
    expect(screen.getByDisplayValue("vinci@example.com")).toBeInTheDocument();
  });

  it("submits an updated name and shows a success message", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: "user-123",
            name: "Vinci",
            email: "vinci@example.com",
            image: null,
            createdAt: "2026-03-17T12:00:00.000Z",
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: "user-123",
            name: "Divine Vinci",
            email: "vinci@example.com",
            image: null,
            createdAt: "2026-03-17T12:00:00.000Z",
          },
        }),
      } as Response);

    render(<ProfileForm />);

    const nameInput = await screen.findByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: "Divine Vinci" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        "/api/v1/user/profile",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ name: "Divine Vinci" }),
        }),
      );
    });

    expect(await screen.findByText("Profile updated successfully.")).toBeInTheDocument();
  });

  it("shows server validation errors", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: "user-123",
            name: "Vinci",
            email: "vinci@example.com",
            image: null,
            createdAt: "2026-03-17T12:00:00.000Z",
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid profile input",
            details: {
              fields: {
                name: "Name is required",
              },
            },
          },
        }),
      } as Response);

    render(<ProfileForm />);

    const nameInput = await screen.findByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: "Updated name" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
  });

  it("shows a load failure message when profile fetch fails", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: {
          message: "Authentication required",
        },
      }),
    } as Response);

    render(<ProfileForm />);

    expect(await screen.findByText("Authentication required")).toBeInTheDocument();
  });
});
