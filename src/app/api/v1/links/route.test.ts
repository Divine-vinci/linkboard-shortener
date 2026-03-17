// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db/links", () => ({
  createLink: vi.fn(),
  findLinkBySlug: vi.fn(),
}));

vi.mock("@/lib/slug", () => ({
  generateSlug: vi.fn(),
}));

const { POST } = await import("@/app/api/v1/links/route");
const authModule = await import("@/lib/auth/config");
const links = await import("@/lib/db/links");
const slug = await import("@/lib/slug");

const mockedAuth = authModule.auth;

describe("src/app/api/v1/links/route.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a link and returns 201", async () => {
    const createdAt = new Date("2026-03-17T18:00:00.000Z");

    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(slug.generateSlug).mockReturnValue("a3Kx9Z2");
    vi.mocked(links.findLinkBySlug).mockResolvedValue(null);
    vi.mocked(links.createLink).mockResolvedValue({
      id: "link-123",
      slug: "a3Kx9Z2",
      targetUrl: "https://example.com",
      title: null,
      description: null,
      tags: [],
      expiresAt: null,
      userId: "user-123",
      createdAt,
      updatedAt: createdAt,
    });

    const response = await POST(
      new Request("http://localhost:3000/api/v1/links", {
        method: "POST",
        body: JSON.stringify({ targetUrl: " https://example.com " }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      data: {
        id: "link-123",
        slug: "a3Kx9Z2",
        targetUrl: "https://example.com",
        userId: "user-123",
        createdAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
      },
    });
    expect(links.findLinkBySlug).toHaveBeenCalledWith("a3Kx9Z2");
    expect(links.createLink).toHaveBeenCalledWith({
      slug: "a3Kx9Z2",
      targetUrl: "https://example.com",
      userId: "user-123",
    });
  });

  it("returns 400 with field errors for invalid urls", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });

    const response = await POST(
      new Request("http://localhost:3000/api/v1/links", {
        method: "POST",
        body: JSON.stringify({ targetUrl: "ftp://example.com" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid link input",
        details: {
          fields: {
            targetUrl: "URL must start with http:// or https://",
          },
        },
      },
    });
    expect(links.createLink).not.toHaveBeenCalled();
  });

  it("returns 401 for unauthenticated requests", async () => {
    vi.mocked(mockedAuth).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3000/api/v1/links", {
        method: "POST",
        body: JSON.stringify({ targetUrl: "https://example.com" }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    });
  });

  it("retries slug generation on collisions", async () => {
    const createdAt = new Date("2026-03-17T18:05:00.000Z");

    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(slug.generateSlug).mockReturnValueOnce("taken12").mockReturnValueOnce("free456");
    vi.mocked(links.findLinkBySlug)
      .mockResolvedValueOnce({
        id: "existing",
        slug: "taken12",
        targetUrl: "https://existing.example.com",
        title: null,
        description: null,
        tags: [],
        expiresAt: null,
        userId: "user-999",
        createdAt,
        updatedAt: createdAt,
      })
      .mockResolvedValueOnce(null);
    vi.mocked(links.createLink).mockResolvedValue({
      id: "link-123",
      slug: "free456",
      targetUrl: "https://example.com/new",
      title: null,
      description: null,
      tags: [],
      expiresAt: null,
      userId: "user-123",
      createdAt,
      updatedAt: createdAt,
    });

    const response = await POST(
      new Request("http://localhost:3000/api/v1/links", {
        method: "POST",
        body: JSON.stringify({ targetUrl: "https://example.com/new" }),
      }),
    );

    expect(response.status).toBe(201);
    expect(slug.generateSlug).toHaveBeenCalledTimes(2);
    expect(links.createLink).toHaveBeenCalledWith({
      slug: "free456",
      targetUrl: "https://example.com/new",
      userId: "user-123",
    });
  });
});
