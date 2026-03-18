import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findPublicBoardBySlugMock, notFoundMock } = vi.hoisted(() => ({
  findPublicBoardBySlugMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("@/lib/db/boards", () => ({
  findPublicBoardBySlug: findPublicBoardBySlugMock,
}));

import PublicBoardPage, { generateMetadata } from "@/app/(public)/b/[slug]/page";

describe("src/app/(public)/b/[slug]/page.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a public board with server-fetched links", async () => {
    findPublicBoardBySlugMock.mockResolvedValue({
      id: "board-1",
      name: "Creator Kit",
      slug: "creator-kit",
      description: "Launch-ready references",
      boardLinks: [
        {
          id: "board-link-1",
          position: 0,
          link: {
            slug: "launch-docs",
            title: "Launch Docs",
            description: "Everything needed to launch",
            targetUrl: "https://docs.example.com/launch",
          },
        },
      ],
    });

    render(await PublicBoardPage({ params: Promise.resolve({ slug: "creator-kit" }) }));

    expect(findPublicBoardBySlugMock).toHaveBeenCalledWith("creator-kit");
    expect(screen.getByRole("heading", { level: 1, name: "Creator Kit" })).toBeInTheDocument();
    expect(screen.getByText("Launch-ready references")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /launch docs/i })).toHaveAttribute("href", "/launch-docs");
  });

  it("throws notFound for private or missing boards", async () => {
    findPublicBoardBySlugMock.mockResolvedValue(null);

    await expect(PublicBoardPage({ params: Promise.resolve({ slug: "private-board" }) })).rejects.toThrow("NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("returns SEO metadata for public boards", async () => {
    findPublicBoardBySlugMock.mockResolvedValue({
      id: "board-1",
      name: "Creator Kit",
      slug: "creator-kit",
      description: "Launch-ready references",
      boardLinks: [],
    });

    await expect(generateMetadata({ params: Promise.resolve({ slug: "creator-kit" }) })).resolves.toEqual({
      title: "Creator Kit — Linkboard",
      description: "Launch-ready references",
      alternates: {
        canonical: "/b/creator-kit",
      },
      openGraph: {
        title: "Creator Kit",
        description: "Launch-ready references",
        url: "/b/creator-kit",
        type: "website",
        images: [
          {
            url: "/og-default.png",
            width: 1200,
            height: 630,
            alt: "Creator Kit",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: "Creator Kit",
        description: "Launch-ready references",
        images: ["/og-default.png"],
      },
    });
  });

  it("returns fallback metadata when the board is unavailable", async () => {
    findPublicBoardBySlugMock.mockResolvedValue(null);

    await expect(generateMetadata({ params: Promise.resolve({ slug: "missing" }) })).resolves.toEqual({
      title: "Board not found — Linkboard",
      description: "This board is unavailable.",
    });
  });

  it("falls back to generated descriptions while keeping OG and Twitter image metadata", async () => {
    findPublicBoardBySlugMock.mockResolvedValue({
      id: "board-2",
      name: "Founder Links",
      slug: "founder-links",
      description: null,
      boardLinks: [],
    });

    await expect(generateMetadata({ params: Promise.resolve({ slug: "founder-links" }) })).resolves.toMatchObject({
      description: "Browse Founder Links on Linkboard.",
      openGraph: {
        description: "Browse Founder Links on Linkboard.",
        images: [
          {
            url: "/og-default.png",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        description: "Browse Founder Links on Linkboard.",
        images: ["/og-default.png"],
      },
    });
  });
});
