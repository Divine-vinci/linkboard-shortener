import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LinkLibrary } from "@/components/links/link-library";

describe("src/components/links/link-library.tsx", () => {
  it("renders metadata when present", () => {
    render(
      <LinkLibrary
        currentTimeMs={new Date("2026-03-17T18:00:00.000Z").getTime()}
        links={[
          {
            id: "link-123",
            slug: "meta123",
            targetUrl: "https://example.com",
            title: "Launch plan",
            description: "Docs to share during rollout.",
            tags: ["docs", "launch"],
            expiresAt: null,
            createdAt: new Date("2026-03-17T18:00:00.000Z"),
          },
        ]}
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
          {
            id: "link-123",
            slug: "plain123",
            targetUrl: "https://example.com",
            title: null,
            description: null,
            tags: [],
            expiresAt: null,
            createdAt: new Date("2026-03-17T18:00:00.000Z"),
          },
        ]}
      />,
    );

    expect(screen.getByText("No metadata added yet.")).toBeInTheDocument();
    expect(screen.queryByLabelText(/link tags/i)).not.toBeInTheDocument();
  });

  it("shows an expired badge for expired links", () => {
    render(
      <LinkLibrary
        currentTimeMs={new Date("2026-03-21T00:00:00.000Z").getTime()}
        links={[
          {
            id: "link-123",
            slug: "expired123",
            targetUrl: "https://example.com",
            title: null,
            description: null,
            tags: [],
            expiresAt: new Date("2026-03-20T15:30:00.000Z"),
            createdAt: new Date("2026-03-17T18:00:00.000Z"),
          },
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
          {
            id: "link-123",
            slug: "future123",
            targetUrl: "https://example.com",
            title: null,
            description: null,
            tags: [],
            expiresAt: new Date("2026-03-20T15:30:00.000Z"),
            createdAt: new Date("2026-03-17T18:00:00.000Z"),
          },
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
          {
            id: "link-123",
            slug: "noexp123",
            targetUrl: "https://example.com",
            title: null,
            description: null,
            tags: [],
            expiresAt: null,
            createdAt: new Date("2026-03-17T18:00:00.000Z"),
          },
        ]}
      />,
    );

    expect(screen.queryByText("Expired")).not.toBeInTheDocument();
    expect(screen.queryByText(/Expires /)).not.toBeInTheDocument();
  });
});
