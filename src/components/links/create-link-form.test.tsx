import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreateLinkForm } from "@/components/links/create-link-form";

describe("src/components/links/create-link-form.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    window.history.replaceState({}, "", "http://localhost:3000/dashboard/links");
  });

  it("shows inline validation for malformed urls", async () => {
    render(<CreateLinkForm />);

    fireEvent.change(screen.getByLabelText(/target url/i), { target: { value: "not-a-url" } });
    fireEvent.click(screen.getByRole("button", { name: /create link/i }));

    expect(await screen.findByText("Enter a valid URL")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("creates a short link and copies it to the clipboard", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: "link-123",
          slug: "a3Kx9Z2",
          targetUrl: "https://example.com/article",
          userId: "user-123",
          createdAt: "2026-03-17T18:00:00.000Z",
          updatedAt: "2026-03-17T18:00:00.000Z",
        },
      }),
    } as Response);

    render(<CreateLinkForm />);

    fireEvent.change(screen.getByLabelText(/target url/i), {
      target: { value: "https://example.com/article" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create link/i }));

    expect(await screen.findByText("http://localhost:3000/a3Kx9Z2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /copy link/i }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("http://localhost:3000/a3Kx9Z2");
    });
    expect(await screen.findByText("Copied!")).toBeInTheDocument();
  });

  it("shows server-side validation errors", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({
        error: {
          message: "Invalid link input",
          details: {
            fields: {
              targetUrl: "URL must start with http:// or https://",
            },
          },
        },
      }),
    } as Response);

    render(<CreateLinkForm />);

    fireEvent.change(screen.getByLabelText(/target url/i), {
      target: { value: "https://example.com/article" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create link/i }));

    expect(await screen.findByText("URL must start with http:// or https://")).toBeInTheDocument();
  });
});
