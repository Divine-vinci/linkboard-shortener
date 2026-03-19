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
    resolveUserId: async (request: Request) => {
      const apiKeyAuth = await authenticateApiKey(request);
      if (apiKeyAuth) return apiKeyAuth.userId;
      const session = await auth();
      return session?.user?.id ?? null;
    },
  };
});

vi.mock("@/lib/db/board-links", () => ({
  addLinkToBoard: vi.fn(),
}));

vi.mock("@/lib/db/boards", () => ({
  findBoardSummaryById: vi.fn(),
}));

vi.mock("@/lib/db/links", () => ({
  findLinkById: vi.fn(),
}));

const { POST } = await import("@/app/api/v1/boards/[id]/links/route");
const authModule = await import("@/lib/auth/config");
const apiKeyAuthModule = await import("@/lib/auth/api-key-middleware");
const boardLinksModule = await import("@/lib/db/board-links");
const boardsModule = await import("@/lib/db/boards");
const linksModule = await import("@/lib/db/links");

const mockedAuth = authModule.auth as Mock;
const mockedAuthenticateApiKey = apiKeyAuthModule.authenticateApiKey as Mock;

function buildBoard(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    userId: "user-123",
    name: "Ideas",
    slug: "ideas",
    description: null,
    visibility: "Private",
    createdAt: new Date("2026-03-18T02:00:00.000Z"),
    updatedAt: new Date("2026-03-18T02:00:00.000Z"),
    _count: { boardLinks: 1 },
    ...overrides,
  };
}

function buildLink(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    userId: "user-123",
    slug: "launch-docs",
    targetUrl: "https://example.com/docs",
    title: "Launch docs",
    description: null,
    tags: ["docs"],
    expiresAt: null,
    createdAt: new Date("2026-03-18T02:00:00.000Z"),
    updatedAt: new Date("2026-03-18T02:00:00.000Z"),
    ...overrides,
  };
}

describe("POST src/app/api/v1/boards/[id]/links/route.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuthenticateApiKey.mockResolvedValue(null);
  });

  it("creates a board-link and returns 201", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(boardsModule.findBoardSummaryById).mockResolvedValue(buildBoard());
    vi.mocked(linksModule.findLinkById).mockResolvedValue(buildLink());
    vi.mocked(boardLinksModule.addLinkToBoard).mockResolvedValue({
      id: "bl-123",
      boardId: "11111111-1111-4111-8111-111111111111",
      linkId: "22222222-2222-4222-8222-222222222222",
      position: 3,
      addedAt: "2026-03-18T03:00:00.000Z",
    });

    const response = await POST(
      new Request("http://localhost:3000/api/v1/boards/11111111-1111-4111-8111-111111111111/links", {
        method: "POST",
        body: JSON.stringify({ linkId: "22222222-2222-4222-8222-222222222222" }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    );

    expect(response.status).toBe(201);
    expect(boardsModule.findBoardSummaryById).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111");
    expect(linksModule.findLinkById).toHaveBeenCalledWith("22222222-2222-4222-8222-222222222222", "user-123");
    expect(boardLinksModule.addLinkToBoard).toHaveBeenCalledWith({
      boardId: "11111111-1111-4111-8111-111111111111",
      linkId: "22222222-2222-4222-8222-222222222222",
    });
    await expect(response.json()).resolves.toEqual({
      data: {
        id: "bl-123",
        boardId: "11111111-1111-4111-8111-111111111111",
        linkId: "22222222-2222-4222-8222-222222222222",
        position: 3,
        addedAt: "2026-03-18T03:00:00.000Z",
      },
    });
  });

  it("creates a board-link with api key auth", async () => {
    mockedAuthenticateApiKey.mockResolvedValue({ userId: "user-123", apiKeyId: "key-123" });
    vi.mocked(boardsModule.findBoardSummaryById).mockResolvedValue(buildBoard());
    vi.mocked(linksModule.findLinkById).mockResolvedValue(buildLink());
    vi.mocked(boardLinksModule.addLinkToBoard).mockResolvedValue({
      id: "bl-123",
      boardId: "11111111-1111-4111-8111-111111111111",
      linkId: "22222222-2222-4222-8222-222222222222",
      position: 3,
      addedAt: "2026-03-18T03:00:00.000Z",
    });

    const response = await POST(
      new Request("http://localhost:3000/api/v1/boards/11111111-1111-4111-8111-111111111111/links", {
        method: "POST",
        headers: { authorization: "Bearer lb_secret" },
        body: JSON.stringify({ linkId: "22222222-2222-4222-8222-222222222222" }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    );

    expect(response.status).toBe(201);
    expect(mockedAuth).not.toHaveBeenCalled();
    expect(linksModule.findLinkById).toHaveBeenCalledWith("22222222-2222-4222-8222-222222222222", "user-123");
  });

  it("returns 409 when the same link is added twice", async () => {
    const duplicateError = Object.assign(new Error("duplicate"), { code: "P2002" });

    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(boardsModule.findBoardSummaryById).mockResolvedValue(buildBoard());
    vi.mocked(linksModule.findLinkById).mockResolvedValue(buildLink());
    vi.mocked(boardLinksModule.addLinkToBoard).mockRejectedValue(duplicateError);

    const response = await POST(
      new Request("http://localhost:3000/api/v1/boards/11111111-1111-4111-8111-111111111111/links", {
        method: "POST",
        body: JSON.stringify({ linkId: "22222222-2222-4222-8222-222222222222" }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "CONFLICT",
        message: "Link is already on this board",
      },
    });
  });

  it("returns 404 when the board is not owned by the session user", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(boardsModule.findBoardSummaryById).mockResolvedValue(buildBoard({ userId: "user-999" }));

    const response = await POST(
      new Request("http://localhost:3000/api/v1/boards/11111111-1111-4111-8111-111111111111/links", {
        method: "POST",
        body: JSON.stringify({ linkId: "22222222-2222-4222-8222-222222222222" }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Board not found",
      },
    });
  });

  it("returns 400 when the link is not found in the user's library", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(boardsModule.findBoardSummaryById).mockResolvedValue(buildBoard());
    vi.mocked(linksModule.findLinkById).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3000/api/v1/boards/11111111-1111-4111-8111-111111111111/links", {
        method: "POST",
        body: JSON.stringify({ linkId: "22222222-2222-4222-8222-222222222222" }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "BAD_REQUEST",
        message: "Invalid link",
      },
    });
    expect(boardLinksModule.addLinkToBoard).not.toHaveBeenCalled();
  });

  it("returns 400 for missing body fields", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });

    const response = await POST(
      new Request("http://localhost:3000/api/v1/boards/11111111-1111-4111-8111-111111111111/links", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid board link input",
        details: {
          fields: {
            linkId: "Select a valid link",
          },
        },
      },
    });
  });

  it("returns 401 for invalid api keys", async () => {
    mockedAuthenticateApiKey.mockResolvedValue(null);
    mockedAuth.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3000/api/v1/boards/11111111-1111-4111-8111-111111111111/links", {
        method: "POST",
        headers: { authorization: "Bearer invalid" },
        body: JSON.stringify({ linkId: "22222222-2222-4222-8222-222222222222" }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    });
  });
});
