import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiKeyManager } from "@/components/settings/api-key-manager";

describe("src/components/settings/api-key-manager.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renders fetched API keys", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "key-123",
            name: "Deploy",
            keyPrefix: "lb_abcd",
            createdAt: "2026-03-18T20:00:00.000Z",
            lastUsedAt: null,
          },
        ],
      }),
    } as Response);

    render(<ApiKeyManager />);

    expect(await screen.findByText("Deploy")).toBeInTheDocument();
    expect(screen.getByText("lb_abcd")).toBeInTheDocument();
  });

  it("creates a key and shows the raw key once", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: "key-123",
            name: "Deploy",
            keyPrefix: "lb_abcd",
            rawKey: "lb_secret_123",
            createdAt: "2026-03-18T20:00:00.000Z",
            lastUsedAt: null,
          },
        }),
      } as Response);

    render(<ApiKeyManager />);

    fireEvent.change(await screen.findByLabelText(/key name/i), { target: { value: "Deploy" } });
    fireEvent.click(screen.getByRole("button", { name: /generate key/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        "/api/v1/user/api-keys",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "Deploy" }),
        }),
      );
    });

    expect(await screen.findByText("This key will not be shown again. Copy it now and store it somewhere secure.")).toBeInTheDocument();
    expect(screen.getByText("lb_secret_123")).toBeInTheDocument();
  });

  it("confirms before deleting a key", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: "key-123",
              name: "Deploy",
              keyPrefix: "lb_abcd",
              createdAt: "2026-03-18T20:00:00.000Z",
              lastUsedAt: null,
            },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
      } as Response);

    render(<ApiKeyManager />);

    fireEvent.click(await screen.findByRole("button", { name: /delete/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /delete key/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        "/api/v1/user/api-keys/key-123",
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("Deploy")).not.toBeInTheDocument();
    });
  });
});
