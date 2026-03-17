import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LinkLibrary } from "@/components/links/link-library";

describe("src/components/links/link-library.tsx", () => {
  it("renders metadata when present", () => {
    render(
      <LinkLibrary
        links={[
          {
            id: "link-123",
            slug: "meta123",
            targetUrl: "https://example.com",
            title: "Launch plan",
            description: "Docs to share during rollout.",
            tags: ["docs", "launch"],
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
        links={[
          {
            id: "link-123",
            slug: "plain123",
            targetUrl: "https://example.com",
            title: null,
            description: null,
            tags: [],
            createdAt: new Date("2026-03-17T18:00:00.000Z"),
          },
        ]}
      />,
    );

    expect(screen.getByText("No metadata added yet.")).toBeInTheDocument();
    expect(screen.queryByLabelText(/link tags/i)).not.toBeInTheDocument();
  });
});
