// @vitest-environment node

import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/auth/api-key-middleware", async () => {
  const { auth } = await import("@/lib/auth/config");
  const authenticateApiKey = vi.fn();
  return {
    authenticateApiKey,
    resolveApiRequestIdentity: async (request: Request) => {
      const apiKeyAuth = await authenticateApiKey(request);

      if (apiKeyAuth) {
        return { userId: apiKeyAuth.userId, rateLimitKey: `api-key:${apiKeyAuth.apiKeyId}`, kind: "apiKey" as const };
      }

      const session = await auth();
      const userId = session?.user?.id ?? null;
      return userId ? { userId, rateLimitKey: `user:${userId}`, kind: "user" as const } : null;
    },
  };
});

vi.mock("@/lib/db/links", () => ({
  createLink: vi.fn(),
  findLinkBySlug: vi.fn(),
  findLinksForLibrary: vi.fn(),
  findLinksWithOffset: vi.fn(),
}));

vi.mock("@/lib/db/board-links", () => ({
  addLinkToBoard: vi.fn(),
}));

vi.mock("@/lib/db/boards", () => ({
  findBoardById: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/slug", () => ({
  generateSlug: vi.fn(),
}));

const { __resetRateLimitStore } = await import("@/lib/rate-limit");
const { GET, POST } = await import("@/app/api/v1/links/route");
const authModule = await import("@/lib/auth/config");
const apiKeyAuthModule = await import("@/lib/auth/api-key-middleware");
const links = await import("@/lib/db/links");
const boardLinksModule = await import("@/lib/db/board-links");
const boardsModule = await import("@/lib/db/boards");
const clientModule = await import("@/lib/db/client");
const slug = await import("@/lib/slug");

const mockedAuth = authModule.auth as Mock;
const mockedAuthenticateApiKey = apiKeyAuthModule.authenticateApiKey as Mock;

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
    __resetRateLimitStore();
    mockedAuthenticateApiKey.mockResolvedValue(null);
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
        expiresAt: null,
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
      expiresAt: undefined,
      userId: "user-123",
    });
  });

  it("returns 429 with retry metadata after the api limit is exceeded", async () => {
    mockedAuthenticateApiKey.mockResolvedValue({ userId: "user-123", apiKeyId: "key-123" });
    vi.mocked(links.findLinksWithOffset).mockResolvedValue({ links: [], total: 0 });

    for (let attempt = 1; attempt <= 100; attempt += 1) {
      const response = await GET(
        new Request(`http://localhost:3000/api/v1/links?offset=${attempt - 1}`, {
          method: "GET",
          headers: { authorization: "Bearer lb_secret" },
        }),
      );

      expect(response.status).toBe(200);
    }

    const response = await GET(
      new Request("http://localhost:3000/api/v1/links?offset=100", {
        method: "GET",
        headers: { authorization: "Bearer lb_secret" },
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeTruthy();
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests",
        details: {
          retryAfter: expect.any(Number),
        },
      },
    });
  });

  it("creates a link with a valid api key", async () => {
    mockedAuthenticateApiKey.mockResolvedValue({ userId: "user-123", apiKeyId: "key-123" });
    vi.mocked(slug.generateSlug).mockReturnValue("api1234");
    vi.mocked(links.findLinkBySlug).mockResolvedValue(null);
    vi.mocked(links.createLink).mockResolvedValue(buildLink({ slug: "api1234" }));

    const response = await POST(
      new Request("http://localhost:3000/api/v1/links", {
        method: "POST",
        headers: { authorization: "Bearer lb_secret" },
        body: JSON.stringify({ targetUrl: "https://example.com" }),
      }),
    );

    expect(response.status).toBe(201);
    expect(mockedAuth).not.toHaveBeenCalled();
    expect(links.createLink).toHaveBeenCalledWith({
      slug: "api1234",
      targetUrl: "https://example.com",
      title: undefined,
      description: undefined,
      tags: undefined,
      expiresAt: undefined,
      userId: "user-123",
    });
  });

  it("accepts API slug payloads and maps them to customSlug behavior", async () => {
    mockedAuthenticateApiKey.mockResolvedValue({ userId: "user-123", apiKeyId: "key-123" });
    vi.mocked(links.findLinkBySlug).mockResolvedValue(null);
    vi.mocked(links.createLink).mockResolvedValue(buildLink({ slug: "my-api-slug" }));

    const response = await POST(
      new Request("http://localhost:3000/api/v1/links", {
        method: "POST",
        headers: { authorization: "Bearer lb_secret" },
        body: JSON.stringify({ targetUrl: "https://example.com", slug: "my-api-slug" }),
      }),
    );

    expect(response.status).toBe(201);
    expect(links.findLinkBySlug).toHaveBeenCalledWith("my-api-slug");
    expect(links.createLink).toHaveBeenCalledWith({
      slug: "my-api-slug",
      targetUrl: "https://example.com",
      title: undefined,
      description: undefined,
      tags: undefined,
      expiresAt: undefined,
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
      expiresAt: undefined,
      userId: "user-123",
    });
  });

  it("creates a link with a board assignment and returns 201", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(slug.generateSlug).mockReturnValue("board123");
    vi.mocked(links.findLinkBySlug).mockResolvedValue(null);
    vi.mocked(clientModule.prisma.$transaction as Mock).mockImplementation(async (callback) => {
      const tx = {
        link: { create: vi.fn().mockResolvedValue(buildLink({ slug: "board123" })) },
      };
      vi.mocked(boardsModule.findBoardById).mockResolvedValue({
        id: "11111111-1111-4111-8111-111111111111",
        userId: "user-123",
        name: "My Board",
        slug: "my-board",
        description: null,
        visibility: "Private" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(boardLinksModule.addLinkToBoard).mockResolvedValue({
        id: "bl-1",
        boardId: "11111111-1111-4111-8111-111111111111",
        linkId: "link-123",
        position: 0,
        addedAt: new Date(),
      });
      return callback(tx);
    });

    const response = await POST(
      new Request("http://localhost:3000/api/v1/links", {
        method: "POST",
        body: JSON.stringify({
          targetUrl: "https://example.com",
          boardId: "11111111-1111-4111-8111-111111111111",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(clientModule.prisma.$transaction).toHaveBeenCalled();
    expect(links.createLink).not.toHaveBeenCalled();
  });

  it("creates a link without board assignment when boardId is omitted", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(slug.generateSlug).mockReturnValue("noboard1");
    vi.mocked(links.findLinkBySlug).mockResolvedValue(null);
    vi.mocked(links.createLink).mockResolvedValue(buildLink({ slug: "noboard1" }));

    const response = await POST(
      new Request("http://localhost:3000/api/v1/links", {
        method: "POST",
        body: JSON.stringify({ targetUrl: "https://example.com" }),
      }),
    );

    expect(response.status).toBe(201);
    expect(clientModule.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid boardId payload", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });

    const response = await POST(
      new Request("http://localhost:3000/api/v1/links", {
        method: "POST",
        body: JSON.stringify({ targetUrl: "https://example.com", boardId: "not-a-uuid" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when board assignment rejects a non-existent board", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(slug.generateSlug).mockReturnValue("board404");
    vi.mocked(links.findLinkBySlug).mockResolvedValue(null);
    vi.mocked(clientModule.prisma.$transaction as Mock).mockImplementation(async (callback) => {
      vi.mocked(boardsModule.findBoardById).mockResolvedValue(null);
      return callback({ link: { create: vi.fn() } });
    });

    const response = await POST(
      new Request("http://localhost:3000/api/v1/links", {
        method: "POST",
        body: JSON.stringify({
          targetUrl: "https://example.com",
          boardId: "11111111-1111-4111-8111-111111111111",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when board assignment rejects another user's board", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(slug.generateSlug).mockReturnValue("board403");
    vi.mocked(links.findLinkBySlug).mockResolvedValue(null);
    vi.mocked(clientModule.prisma.$transaction as Mock).mockImplementation(async (callback) => {
      vi.mocked(boardsModule.findBoardById).mockResolvedValue({
        id: "22222222-2222-4222-8222-222222222222",
        userId: "other-user",
        name: "Other Board",
        slug: "other-board",
        description: null,
        visibility: "Private" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return callback({ link: { create: vi.fn() } });
    });

    const response = await POST(
      new Request("http://localhost:3000/api/v1/links", {
        method: "POST",
        body: JSON.stringify({
          targetUrl: "https://example.com",
          boardId: "22222222-2222-4222-8222-222222222222",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("creates a link with expiration and returns it in the response", async () => {
    const expiresAt = "2099-03-20T15:30:00.000Z";

    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(slug.generateSlug).mockReturnValue("exp1234");
    vi.mocked(links.findLinkBySlug).mockResolvedValue(null);
    vi.mocked(links.createLink).mockResolvedValue(
      buildLink({
        slug: "exp1234",
        expiresAt: new Date(expiresAt),
      }),
    );

    const response = await POST(
      new Request("http://localhost:3000/api/v1/links", {
        method: "POST",
        body: JSON.stringify({
          targetUrl: "https://example.com",
          expiresAt,
        }),
      }),
    );

    expect(response.status).toBe(201);
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
  });

  it("returns 401 for invalid api keys", async () => {
    mockedAuthenticateApiKey.mockResolvedValue(null);
    mockedAuth.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3000/api/v1/links", {
        method: "POST",
        headers: { authorization: "Bearer invalid" },
        body: JSON.stringify({ targetUrl: "https://example.com" }),
      }),
    );

    expect(response.status).toBe(401);
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
  });

  it("creates a link with custom slug and returns 201", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.findLinkBySlug).mockResolvedValue(null);
    vi.mocked(links.createLink).mockResolvedValue(buildLink({ slug: "my-custom-slug", id: "link-456" }));

    const response = await POST(
      new Request("http://localhost:3000/api/v1/links", {
        method: "POST",
        body: JSON.stringify({ targetUrl: "https://example.com", customSlug: "my-custom-slug" }),
      }),
    );

    expect(response.status).toBe(201);
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
  });
});

describe("GET src/app/api/v1/links/route.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetRateLimitStore();
    mockedAuthenticateApiKey.mockResolvedValue(null);
  });

  it("returns paginated library data for authenticated users", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.findLinksForLibrary).mockResolvedValue({
      links: [buildLink({ slug: "docs-1", tags: ["docs"] })],
      total: 41,
    });

    const response = await GET(new Request("http://localhost:3000/api/v1/links?q=docs&tag=docs&page=2&limit=20"));

    expect(response.status).toBe(200);
    expect(links.findLinksForLibrary).toHaveBeenCalledWith({
      userId: "user-123",
      query: "docs",
      tag: "docs",
      page: 2,
      limit: 20,
    });
  });

  it("returns api-style offset pagination for valid api keys", async () => {
    mockedAuthenticateApiKey.mockResolvedValue({ userId: "user-123", apiKeyId: "key-123" });
    vi.mocked(links.findLinksWithOffset).mockResolvedValue({
      links: [buildLink({ slug: "docs-1", tags: ["docs"] })],
      total: 41,
    });

    const response = await GET(new Request("http://localhost:3000/api/v1/links?search=docs&sortBy=updatedAt&limit=20&offset=0", {
      headers: { authorization: "Bearer lb_secret" },
    }));

    expect(response.status).toBe(200);
    expect(links.findLinksWithOffset).toHaveBeenCalledWith({
      userId: "user-123",
      query: "docs",
      sortBy: "updatedAt",
      limit: 20,
      offset: 0,
    });
    expect(mockedAuth).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid api query params", async () => {
    mockedAuthenticateApiKey.mockResolvedValue({ userId: "user-123", apiKeyId: "key-123" });

    const response = await GET(new Request("http://localhost:3000/api/v1/links?offset=-1&limit=101", {
      headers: { authorization: "Bearer lb_secret" },
    }));

    expect(response.status).toBe(400);
    expect(links.findLinksWithOffset).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid query params", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });

    const response = await GET(new Request("http://localhost:3000/api/v1/links?page=0&limit=101"));

    expect(response.status).toBe(400);
    expect(links.findLinksForLibrary).not.toHaveBeenCalled();
  });

  it("re-throws unexpected errors from findLinksForLibrary", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.findLinksForLibrary).mockRejectedValue(new Error("database connection lost"));

    await expect(GET(new Request("http://localhost:3000/api/v1/links"))).rejects.toThrow(
      "database connection lost",
    );
  });

  it("returns 401 for unauthenticated library requests", async () => {
    vi.mocked(mockedAuth).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost:3000/api/v1/links"));

    expect(response.status).toBe(401);
  });
});
