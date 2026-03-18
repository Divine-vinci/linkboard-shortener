import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { refresh } = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

import { LinkLibrary } from "@/components/links/link-library";

function buildLink(overrides: Record<string, unknown> = {}) {
  return {
    id: "link-123",
    slug: "meta123",
    targetUrl: "https://example.com",
    title: "Launch plan",
    description: "Docs to share during rollout.",
    tags: ["docs", "launch"],
    expiresAt: null,
    createdAt: new Date("2026-03-17T18:00:00.000Z"),
    ...overrides,
  };
}

describe("src/components/links/link-library.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  it("renders metadata and placeholders when present", () => {
    render(
      <LinkLibrary
        currentTimeMs={new Date("2026-03-17T18:00:00.000Z").getTime()}
        links={[buildLink()]}
      />,
    );

    expect(screen.getByText("Launch plan")).toBeInTheDocument();
    expect(screen.getByText("Docs to share during rollout.")).toBeInTheDocument();
    expect(screen.getByText("#docs")).toBeInTheDocument();
    expect(screen.getByText("#launch")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View analytics" })).toHaveAttribute("href", "/dashboard/links/link-123/analytics");
    expect(screen.getByText("No boards")).toBeInTheDocument();
  });

  it("renders fallback text when metadata is missing", () => {
    render(
      <LinkLibrary
        currentTimeMs={new Date("2026-03-17T18:00:00.000Z").getTime()}
        links={[
          buildLink({
            slug: "plain123",
            title: null,
            description: null,
            tags: [],
          }),
        ]}
      />,
    );

    expect(screen.getByText("No metadata added yet.")).toBeInTheDocument();
    expect(screen.queryByLabelText(/link tags/i)).not.toBeInTheDocument();
  });

  it("renders filtered empty-state copy", () => {
    render(<LinkLibrary currentTimeMs={Date.now()} links={[]} query="docs" />);

    expect(screen.getByText("No links matched your current search or tag filter.")).toBeInTheDocument();
  });

  it("opens the targetUrl edit form with the current url", () => {
    render(
      <LinkLibrary
        currentTimeMs={new Date("2026-03-17T18:00:00.000Z").getTime()}
        links={[buildLink()]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByLabelText("Target URL for /meta123")).toHaveValue("https://example.com");
  });

  it("submits a targetUrl update and refreshes the route", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          targetUrl: "https://example.com/updated",
        },
      }),
    } as Response);

    render(
      <LinkLibrary
        currentTimeMs={new Date("2026-03-17T18:00:00.000Z").getTime()}
        links={[buildLink()]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Target URL for /meta123"), {
      target: { value: "https://example.com/updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/v1/links/link-123",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ targetUrl: "https://example.com/updated" }),
        }),
      );
    });

    expect(refresh).toHaveBeenCalled();
  });

  it("renders targetUrl validation errors from the api", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({
        error: {
          message: "Invalid link update input",
          details: {
            fields: {
              targetUrl: "Enter a valid URL",
            },
          },
        },
      }),
    } as Response);

    render(
      <LinkLibrary
        currentTimeMs={new Date("2026-03-17T18:00:00.000Z").getTime()}
        links={[buildLink()]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Target URL for /meta123"), {
      target: { value: "not-a-url" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Enter a valid URL")).toBeInTheDocument();
  });

  it("asks for confirmation before deleting and refreshes on success", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => "",
    } as Response);

    render(
      <LinkLibrary
        currentTimeMs={new Date("2026-03-17T18:00:00.000Z").getTime()}
        links={[buildLink()]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(window.confirm).toHaveBeenCalledWith("Delete /meta123? This cannot be undone.");
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/v1/links/link-123",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("shows an error when delete fails", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({
        error: {
          message: "Link not found",
        },
      }),
    } as Response);

    render(
      <LinkLibrary
        currentTimeMs={new Date("2026-03-17T18:00:00.000Z").getTime()}
        links={[buildLink()]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("Link not found")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows an expired badge for expired links", () => {
    render(
      <LinkLibrary
        currentTimeMs={new Date("2026-03-21T00:00:00.000Z").getTime()}
        links={[
          buildLink({
            slug: "expired123",
            title: null,
            description: null,
            tags: [],
            expiresAt: new Date("2026-03-20T15:30:00.000Z"),
          }),
        ]}
      />,
    );

    expect(screen.getByText("Expired")).toBeInTheDocument();
  });
});
