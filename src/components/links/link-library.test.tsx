import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  });

  it("renders metadata when present", () => {
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

  it("shows an edit button for each link", () => {
    render(
      <LinkLibrary
        currentTimeMs={new Date("2026-03-17T18:00:00.000Z").getTime()}
        links={[buildLink()]}
      />,
    );

    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
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

  it("submits a targetUrl update and refreshes the displayed url", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: "link-123",
          slug: "meta123",
          targetUrl: "https://example.com/updated",
          title: "Launch plan",
          description: "Docs to share during rollout.",
          tags: ["docs", "launch"],
          expiresAt: null,
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

    expect(await screen.findByText("https://example.com/updated")).toBeInTheDocument();
    expect(screen.queryByLabelText("Target URL for /meta123")).not.toBeInTheDocument();
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

  it("shows formatted expiration for active links", () => {
    render(
      <LinkLibrary
        currentTimeMs={new Date("2026-03-19T00:00:00.000Z").getTime()}
        links={[
          buildLink({
            slug: "future123",
            title: null,
            description: null,
            tags: [],
            expiresAt: new Date("2026-03-20T15:30:00.000Z"),
          }),
        ]}
      />,
    );

    expect(screen.getByText("Expires Mar 20, 2026")).toBeInTheDocument();
    expect(screen.queryByText("Expired")).not.toBeInTheDocument();
  });

  it("shows no expiration badge for links without expiration", () => {
    render(
      <LinkLibrary
        currentTimeMs={new Date("2026-03-17T18:00:00.000Z").getTime()}
        links={[
          buildLink({
            slug: "noexp123",
            title: null,
            description: null,
            tags: [],
            expiresAt: null,
          }),
        ]}
      />,
    );

    expect(screen.queryByText("Expired")).not.toBeInTheDocument();
    expect(screen.queryByText(/Expires /)).not.toBeInTheDocument();
  });
});
