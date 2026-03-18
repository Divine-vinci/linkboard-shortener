import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

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

  it("renders metadata input fields", () => {
    render(<CreateLinkForm />);

    expect(screen.getByLabelText(/custom slug/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^tags/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^expiration date/i)).toBeInTheDocument();
  });

  it("creates a short link and copies it to the clipboard", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: "link-123",
          slug: "a3Kx9Z2",
          targetUrl: "https://example.com/article",
          title: null,
          description: null,
          tags: [],
          expiresAt: null,
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

  it("submits metadata with normalized tags", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: "link-123",
          slug: "meta123",
          targetUrl: "https://example.com/article",
          title: "Launch plan",
          description: "Docs for launch day",
          tags: ["docs", "launch"],
          expiresAt: null,
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
    fireEvent.change(screen.getByLabelText(/^title/i), {
      target: { value: "Launch plan" },
    });
    fireEvent.change(screen.getByLabelText(/^description/i), {
      target: { value: "Docs for launch day" },
    });
    fireEvent.change(screen.getByLabelText(/^tags/i), {
      target: { value: "Docs, launch, docs" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create link/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/v1/links",
        expect.objectContaining({
          body: JSON.stringify({
            targetUrl: "https://example.com/article",
            title: "Launch plan",
            description: "Docs for launch day",
            tags: ["docs", "launch"],
          }),
        }),
      );
    });
  });

  it("submits expiration as ISO 8601 when provided", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: "link-123",
          slug: "exp123",
          targetUrl: "https://example.com/article",
          title: null,
          description: null,
          tags: [],
          expiresAt: "2099-03-20T15:30:00.000Z",
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
    fireEvent.change(screen.getByLabelText(/^expiration date/i), {
      target: { value: "2099-03-20T15:30" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create link/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/v1/links",
        expect.objectContaining({
          body: JSON.stringify({
            targetUrl: "https://example.com/article",
            expiresAt: new Date("2099-03-20T15:30").toISOString(),
          }),
        }),
      );
    });
  });

  it("shows server-side validation errors for metadata fields", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({
        error: {
          message: "Invalid link input",
          details: {
            fields: {
              title: "Title must be at most 120 characters",
            },
          },
        },
      }),
    } as Response);

    render(<CreateLinkForm />);

    fireEvent.change(screen.getByLabelText(/target url/i), {
      target: { value: "https://example.com/article" },
    });
    fireEvent.change(screen.getByLabelText(/^title/i), {
      target: { value: "Launch plan" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create link/i }));

    expect(await screen.findByText("Title must be at most 120 characters")).toBeInTheDocument();
  });

  it("shows slug preview as user types custom slug", async () => {
    render(<CreateLinkForm />);

    fireEvent.change(screen.getByLabelText(/custom slug/i), {
      target: { value: "my-link" },
    });

    expect(await screen.findByText("http://localhost:3000/my-link")).toBeInTheDocument();
  });

  it("shows 409 conflict error on custom slug field", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        error: {
          code: "CONFLICT",
          message: "Custom slug already exists",
        },
      }),
    } as Response);

    render(<CreateLinkForm />);

    fireEvent.change(screen.getByLabelText(/target url/i), {
      target: { value: "https://example.com" },
    });
    fireEvent.change(screen.getByLabelText(/custom slug/i), {
      target: { value: "taken-slug" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create link/i }));

    expect(await screen.findByText("Custom slug already exists")).toBeInTheDocument();
  });

  it("renders a board selector with provided boards", () => {
    render(
      <CreateLinkForm
        boards={[
          { id: "board-1", name: "Ideas" },
          { id: "board-2", name: "Work" },
        ]}
      />,
    );

    const select = screen.getByLabelText(/^board/i);
    expect(select).toBeInTheDocument();
    expect(screen.getByText("No board")).toBeInTheDocument();
    expect(screen.getByText("Ideas")).toBeInTheDocument();
    expect(screen.getByText("Work")).toBeInTheDocument();
  });

  it("renders board selector with no options when boards list is empty", () => {
    render(<CreateLinkForm />);

    const select = screen.getByLabelText(/^board/i);
    expect(select).toBeInTheDocument();
    expect(screen.getByText("No board")).toBeInTheDocument();
    expect(screen.getByText("No boards yet.")).toBeInTheDocument();
  });

  it("submits boardId when a board is selected", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: "link-123",
          slug: "board1",
          targetUrl: "https://example.com",
          title: null,
          description: null,
          tags: [],
          expiresAt: null,
          userId: "user-123",
          createdAt: "2026-03-17T18:00:00.000Z",
          updatedAt: "2026-03-17T18:00:00.000Z",
        },
      }),
    } as Response);

    render(
      <CreateLinkForm boards={[{ id: "11111111-1111-4111-8111-111111111111", name: "Ideas" }]} />,
    );

    fireEvent.change(screen.getByLabelText(/target url/i), {
      target: { value: "https://example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^board/i), {
      target: { value: "11111111-1111-4111-8111-111111111111" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create link/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/v1/links",
        expect.objectContaining({
          body: JSON.stringify({
            targetUrl: "https://example.com",
            boardId: "11111111-1111-4111-8111-111111111111",
          }),
        }),
      );
    });
  });

  it("shows server-side boardId validation error", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({
        error: {
          code: "BAD_REQUEST",
          message: "Invalid board",
          details: {
            fields: {
              boardId: "Select a valid board",
            },
          },
        },
      }),
    } as Response);

    render(
      <CreateLinkForm boards={[{ id: "11111111-1111-4111-8111-111111111111", name: "Ideas" }]} />,
    );

    fireEvent.change(screen.getByLabelText(/target url/i), {
      target: { value: "https://example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^board/i), {
      target: { value: "11111111-1111-4111-8111-111111111111" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create link/i }));

    expect(await screen.findByText("Select a valid board")).toBeInTheDocument();
  });

  it("submits without optional metadata when fields are empty", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: "link-123",
          slug: "a3Kx9Z2",
          targetUrl: "https://example.com",
          title: null,
          description: null,
          tags: [],
          expiresAt: null,
          userId: "user-123",
          createdAt: "2026-03-17T18:00:00.000Z",
          updatedAt: "2026-03-17T18:00:00.000Z",
        },
      }),
    } as Response);

    render(<CreateLinkForm />);

    fireEvent.change(screen.getByLabelText(/target url/i), {
      target: { value: "https://example.com" },
    });
    fireEvent.change(screen.getByLabelText(/custom slug/i), {
      target: { value: "   " },
    });
    fireEvent.change(screen.getByLabelText(/^title/i), {
      target: { value: "   " },
    });
    fireEvent.change(screen.getByLabelText(/^description/i), {
      target: { value: "   " },
    });
    fireEvent.change(screen.getByLabelText(/^tags/i), {
      target: { value: "   " },
    });
    fireEvent.change(screen.getByLabelText(/^expiration date/i), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create link/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/v1/links",
        expect.objectContaining({
          body: JSON.stringify({ targetUrl: "https://example.com" }),
        }),
      );
    });
  });
});
