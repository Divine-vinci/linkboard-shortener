// @vitest-environment node

import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db/links", () => ({
  updateLink: vi.fn(),
}));

const { PATCH } = await import("@/app/api/v1/links/[id]/route");
const authModule = await import("@/lib/auth/config");
const links = await import("@/lib/db/links");

const mockedAuth = authModule.auth as Mock;

function buildLink(overrides: Partial<Record<string, unknown>> = {}) {
  const createdAt = new Date("2026-03-17T18:00:00.000Z");

  return {
    id: "link-123",
    slug: "meta123",
    targetUrl: "https://example.com",
    title: "Launch plan",
    description: "Docs to share during rollout.",
    tags: ["docs", "launch"],
    expiresAt: null,
    userId: "user-123",
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

describe("src/app/api/v1/links/[id]/route.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates link metadata and returns the updated link", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.updateLink).mockResolvedValue(
      buildLink({ title: "Updated title", description: "New notes", tags: ["updated", "docs"] }),
    );

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({
          title: "  Updated title  ",
          description: "  New notes  ",
          tags: ["Updated", "docs", "updated", " "],
        }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(200);
    expect(links.updateLink).toHaveBeenCalledWith("link-123", "user-123", {
      title: "Updated title",
      description: "New notes",
      tags: ["updated", "docs"],
    });
    await expect(response.json()).resolves.toEqual({
      data: {
        id: "link-123",
        slug: "meta123",
        targetUrl: "https://example.com",
        title: "Updated title",
        description: "New notes",
        tags: ["updated", "docs"],
        userId: "user-123",
        createdAt: "2026-03-17T18:00:00.000Z",
        updatedAt: "2026-03-17T18:00:00.000Z",
      },
    });
  });

  it("supports partial metadata updates", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.updateLink).mockResolvedValue(buildLink({ title: "Only title changed" }));

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ title: "Only title changed" }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(200);
    expect(links.updateLink).toHaveBeenCalledWith("link-123", "user-123", {
      title: "Only title changed",
    });
  });

  it("returns 400 for invalid metadata payloads", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ tags: ["x".repeat(25)] }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid link metadata input",
        details: {
          fields: {
            tags: "Each tag must be at most 24 characters",
          },
        },
      },
    });
    expect(links.updateLink).not.toHaveBeenCalled();
  });

  it("returns 401 for unauthenticated requests", async () => {
    vi.mocked(mockedAuth).mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ title: "Nope" }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    });
  });

  it("returns 400 for empty patch body with no metadata fields", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(400);
    expect(links.updateLink).not.toHaveBeenCalled();
  });

  it("clears metadata fields when null is sent", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.updateLink).mockResolvedValue(
      buildLink({ title: null, description: null, tags: [] }),
    );

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ title: null, tags: [] }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(200);
    expect(links.updateLink).toHaveBeenCalledWith("link-123", "user-123", {
      title: null,
      tags: [],
    });
  });

  it("returns 404 when the link does not exist or is not owned by the user", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.updateLink).mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-404", {
        method: "PATCH",
        body: JSON.stringify({ title: "Still nope" }),
      }),
      { params: Promise.resolve({ id: "link-404" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Link not found",
      },
    });
  });
});
