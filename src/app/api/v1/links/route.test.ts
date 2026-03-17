// @vitest-environment node

import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

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

const mockedAuth = authModule.auth as Mock;

function buildLink(overrides: Partial<Record<string, unknown>> = {}) {
  const createdAt = new Date("2026-03-17T18:00:00.000Z");

  return {
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
    ...overrides,
  };
}

describe("src/app/api/v1/links/route.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a link and returns 201", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(slug.generateSlug).mockReturnValue("a3Kx9Z2");
    vi.mocked(links.findLinkBySlug).mockResolvedValue(null);
    vi.mocked(links.createLink).mockResolvedValue(buildLink());

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
        title: null,
        description: null,
        tags: [],
        userId: "user-123",
        createdAt: "2026-03-17T18:00:00.000Z",
        updatedAt: "2026-03-17T18:00:00.000Z",
      },
    });
    expect(links.createLink).toHaveBeenCalledWith({
      slug: "a3Kx9Z2",
      targetUrl: "https://example.com",
      title: undefined,
      description: undefined,
      tags: undefined,
      userId: "user-123",
    });
  });

  it("creates a link with metadata and returns it in the response", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(slug.generateSlug).mockReturnValue("meta123");
    vi.mocked(links.findLinkBySlug).mockResolvedValue(null);
    vi.mocked(links.createLink).mockResolvedValue(
      buildLink({
        slug: "meta123",
        title: "Launch plan",
        description: "Docs to share during rollout.",
        tags: ["docs", "launch"],
      }),
    );

    const response = await POST(
      new Request("http://localhost:3000/api/v1/links", {
        method: "POST",
        body: JSON.stringify({
          targetUrl: "https://example.com",
          title: "  Launch plan  ",
          description: " Docs to share during rollout. ",
          tags: ["Docs", "launch", "docs", " "],
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(links.createLink).toHaveBeenCalledWith({
      slug: "meta123",
      targetUrl: "https://example.com",
      title: "Launch plan",
      description: "Docs to share during rollout.",
      tags: ["docs", "launch"],
      userId: "user-123",
    });
    await expect(response.json()).resolves.toEqual({
      data: {
        id: "link-123",
        slug: "meta123",
        targetUrl: "https://example.com",
        title: "Launch plan",
        description: "Docs to share during rollout.",
        tags: ["docs", "launch"],
        userId: "user-123",
        createdAt: "2026-03-17T18:00:00.000Z",
        updatedAt: "2026-03-17T18:00:00.000Z",
      },
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

  it("creates a link with custom slug and returns 201", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.findLinkBySlug).mockResolvedValue(null);
    vi.mocked(links.createLink).mockResolvedValue(
      buildLink({ slug: "my-custom-slug", id: "link-456" }),
    );

    const response = await POST(
      new Request("http://localhost:3000/api/v1/links", {
        method: "POST",
        body: JSON.stringify({ targetUrl: "https://example.com", customSlug: "my-custom-slug" }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      data: {
        id: "link-456",
        slug: "my-custom-slug",
        targetUrl: "https://example.com",
        title: null,
        description: null,
        tags: [],
        userId: "user-123",
        createdAt: "2026-03-17T18:00:00.000Z",
        updatedAt: "2026-03-17T18:00:00.000Z",
      },
    });
    expect(links.createLink).toHaveBeenCalledWith({
      slug: "my-custom-slug",
      targetUrl: "https://example.com",
      title: undefined,
      description: undefined,
      tags: undefined,
      userId: "user-123",
    });
    expect(slug.generateSlug).not.toHaveBeenCalled();
  });

  it("returns 409 for duplicate custom slug", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.findLinkBySlug).mockResolvedValue(buildLink({ id: "existing-link", slug: "taken-slug" }));

    const response = await POST(
      new Request("http://localhost:3000/api/v1/links", {
        method: "POST",
        body: JSON.stringify({ targetUrl: "https://example.com", customSlug: "taken-slug" }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "CONFLICT",
        message: "Custom slug already exists",
      },
    });
    expect(links.createLink).not.toHaveBeenCalled();
  });

  it("returns 400 for reserved word slug", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });

    const response = await POST(
      new Request("http://localhost:3000/api/v1/links", {
        method: "POST",
        body: JSON.stringify({ targetUrl: "https://example.com", customSlug: "api" }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();

    expect(body.error.details.fields.customSlug).toBe("This slug is reserved and cannot be used");
    expect(links.createLink).not.toHaveBeenCalled();
  });

  it("falls back to auto-generated slug when customSlug is whitespace only", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(slug.generateSlug).mockReturnValue("a3Kx9Z2");
    vi.mocked(links.findLinkBySlug).mockResolvedValue(null);
    vi.mocked(links.createLink).mockResolvedValue(buildLink());

    const response = await POST(
      new Request("http://localhost:3000/api/v1/links", {
        method: "POST",
        body: JSON.stringify({ targetUrl: "https://example.com", customSlug: "   " }),
      }),
    );

    expect(response.status).toBe(201);
    expect(slug.generateSlug).toHaveBeenCalled();
  });

  it("retries auto-generated slug creation when the database races on insert", async () => {
    const prismaError = new Error("Unique constraint failed on the fields: (slug)");
    Object.assign(prismaError, { code: "P2002", meta: { target: ["slug"] } });

    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(slug.generateSlug).mockReturnValueOnce("taken12").mockReturnValueOnce("free456");
    vi.mocked(links.findLinkBySlug).mockResolvedValue(null);
    vi.mocked(links.createLink)
      .mockRejectedValueOnce(prismaError)
      .mockResolvedValueOnce(buildLink({ slug: "free456", targetUrl: "https://example.com/new" }));

    const response = await POST(
      new Request("http://localhost:3000/api/v1/links", {
        method: "POST",
        body: JSON.stringify({ targetUrl: "https://example.com/new" }),
      }),
    );

    expect(response.status).toBe(201);
    expect(slug.generateSlug).toHaveBeenCalledTimes(2);
    expect(links.createLink).toHaveBeenNthCalledWith(1, {
      slug: "taken12",
      targetUrl: "https://example.com/new",
      title: undefined,
      description: undefined,
      tags: undefined,
      userId: "user-123",
    });
    expect(links.createLink).toHaveBeenNthCalledWith(2, {
      slug: "free456",
      targetUrl: "https://example.com/new",
      title: undefined,
      description: undefined,
      tags: undefined,
      userId: "user-123",
    });
  });
});
