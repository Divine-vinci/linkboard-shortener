// @vitest-environment node

import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db/links", () => ({
  deleteLink: vi.fn(),
  updateLink: vi.fn(),
}));

const { DELETE, PATCH } = await import("@/app/api/v1/links/[id]/route");
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

  it("updates targetUrl only and preserves the slug", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.updateLink).mockResolvedValue(
      buildLink({ targetUrl: "https://example.com/updated" }),
    );

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ targetUrl: " https://example.com/updated " }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(200);
    expect(links.updateLink).toHaveBeenCalledWith("link-123", "user-123", {
      targetUrl: "https://example.com/updated",
    });
    await expect(response.json()).resolves.toEqual({
      data: expect.objectContaining({
        slug: "meta123",
        targetUrl: "https://example.com/updated",
      }),
    });
  });

  it("updates targetUrl and metadata in one request", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.updateLink).mockResolvedValue(
      buildLink({ targetUrl: "https://example.com/new", title: "Updated title" }),
    );

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({
          targetUrl: "https://example.com/new",
          title: "  Updated title  ",
        }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(200);
    expect(links.updateLink).toHaveBeenCalledWith("link-123", "user-123", {
      targetUrl: "https://example.com/new",
      title: "Updated title",
    });
    await expect(response.json()).resolves.toEqual({
      data: expect.objectContaining({
        targetUrl: "https://example.com/new",
        title: "Updated title",
      }),
    });
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
        expiresAt: null,
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

  it("sets expiration on a link", async () => {
    const expiresAt = "2099-03-22T12:00:00.000Z";

    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.updateLink).mockResolvedValue(buildLink({ expiresAt: new Date(expiresAt) }));

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ expiresAt }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(200);
    expect(links.updateLink).toHaveBeenCalledWith("link-123", "user-123", {
      expiresAt: new Date(expiresAt),
    });
    await expect(response.json()).resolves.toEqual({
      data: expect.objectContaining({
        expiresAt,
      }),
    });
  });

  it("changes expiration on a link", async () => {
    const expiresAt = "2099-03-25T18:30:00.000Z";

    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.updateLink).mockResolvedValue(buildLink({ expiresAt: new Date(expiresAt) }));

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ expiresAt }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(200);
    expect(links.updateLink).toHaveBeenCalledWith("link-123", "user-123", {
      expiresAt: new Date(expiresAt),
    });
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

  it("clears expiration when null is sent", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.updateLink).mockResolvedValue(buildLink({ expiresAt: null }));

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ expiresAt: null }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(200);
    expect(links.updateLink).toHaveBeenCalledWith("link-123", "user-123", {
      expiresAt: null,
    });
    await expect(response.json()).resolves.toEqual({
      data: expect.objectContaining({
        expiresAt: null,
      }),
    });
  });

  it("returns 400 for malformed targetUrl payloads", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ targetUrl: "not-a-url" }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid link update input",
        details: {
          fields: {
            targetUrl: "Enter a valid URL",
          },
        },
      },
    });
    expect(links.updateLink).not.toHaveBeenCalled();
  });

  it("returns 400 for non-http targetUrl payloads", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ targetUrl: "ftp://example.com" }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid link update input",
        details: {
          fields: {
            targetUrl: "URL must start with http:// or https://",
          },
        },
      },
    });
    expect(links.updateLink).not.toHaveBeenCalled();
  });

  it("returns 400 for empty-string targetUrl payloads", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ targetUrl: "" }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid link update input",
        details: {
          fields: {
            targetUrl: "Target URL is required",
          },
        },
      },
    });
    expect(links.updateLink).not.toHaveBeenCalled();
  });

  it("returns 400 for null targetUrl payloads", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ targetUrl: null }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid link update input",
        details: {
          fields: {
            targetUrl: "Target URL is required",
          },
        },
      },
    });
    expect(links.updateLink).not.toHaveBeenCalled();
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
        message: "Invalid link update input",
        details: {
          fields: {
            tags: "Each tag must be at most 24 characters",
          },
        },
      },
    });
    expect(links.updateLink).not.toHaveBeenCalled();
  });

  it("returns 400 for past expiration payloads", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ expiresAt: "2020-03-20T15:30:00.000Z" }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid link update input",
        details: {
          fields: {
            expiresAt: "Expiration must be in the future",
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
        body: JSON.stringify({ targetUrl: "https://example.com/nope" }),
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

  it("returns 400 for empty patch body with no updatable fields", async () => {
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

  it("returns 404 when the link does not exist or is not owned by the user", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.updateLink).mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-404", {
        method: "PATCH",
        body: JSON.stringify({ targetUrl: "https://example.com/still-nope" }),
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

  it("deletes an owned link with a 204 response and empty body", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.deleteLink).mockResolvedValue(true);

    const response = await DELETE(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(204);
    expect(links.deleteLink).toHaveBeenCalledWith("link-123", "user-123");
    expect(await response.text()).toBe("");
  });

  it("returns 404 when deleting a non-existent link", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.deleteLink).mockResolvedValue(false);

    const response = await DELETE(
      new Request("http://localhost:3000/api/v1/links/link-404", {
        method: "DELETE",
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

  it("returns 404 when deleting a link not owned by the user", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.deleteLink).mockResolvedValue(false);

    const response = await DELETE(
      new Request("http://localhost:3000/api/v1/links/link-999", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "link-999" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Link not found",
      },
    });
  });

  it("returns 401 for unauthenticated delete requests", async () => {
    vi.mocked(mockedAuth).mockResolvedValue(null);

    const response = await DELETE(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "DELETE",
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

  it("returns 404 for invalid UUID link ids during delete", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    const prismaValidationError = new Error("invalid input syntax for type uuid");
    prismaValidationError.name = "PrismaClientValidationError";
    vi.mocked(links.deleteLink).mockRejectedValue(prismaValidationError);

    const response = await DELETE(
      new Request("http://localhost:3000/api/v1/links/not-a-uuid", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "not-a-uuid" }) },
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
