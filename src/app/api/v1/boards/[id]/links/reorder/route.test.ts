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
  getBoardLinksWithMetadata: vi.fn(),
  reorderBoardLinks: vi.fn(),
}));

vi.mock("@/lib/db/boards", () => ({
  findBoardSummaryById: vi.fn(),
}));

const { PATCH } = await import("@/app/api/v1/boards/[id]/links/reorder/route");
const authModule = await import("@/lib/auth/config");
const apiKeyAuthModule = await import("@/lib/auth/api-key-middleware");
const boardLinksModule = await import("@/lib/db/board-links");
const boardsModule = await import("@/lib/db/boards");

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
    _count: { boardLinks: 2 },
    ...overrides,
  };
}

function buildBoardLink(id: string, linkId: string, position: number) {
  return {
    id,
    boardId: "11111111-1111-4111-8111-111111111111",
    linkId,
    position,
    addedAt: new Date("2026-03-18T02:00:00.000Z"),
    link: {
      id: linkId,
      slug: `slug-${position}`,
      targetUrl: `https://example.com/${position}`,
      title: `Link ${position}`,
      description: null,
      tags: [],
      expiresAt: null,
      userId: "user-123",
      createdAt: new Date("2026-03-18T02:00:00.000Z"),
      updatedAt: new Date("2026-03-18T02:00:00.000Z"),
    },
  };
}

describe("PATCH src/app/api/v1/boards/[id]/links/reorder/route.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuthenticateApiKey.mockResolvedValue(null);
  });

  it("reorders board links and returns 200", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(boardsModule.findBoardSummaryById).mockResolvedValue(buildBoard());
    vi.mocked(boardLinksModule.getBoardLinksWithMetadata).mockResolvedValue([
      buildBoardLink("bl-1", "22222222-2222-4222-8222-222222222222", 0),
      buildBoardLink("bl-2", "33333333-3333-4333-8333-333333333333", 1),
    ]);
    vi.mocked(boardLinksModule.reorderBoardLinks).mockResolvedValue([
      {
        id: "bl-2",
        boardId: "11111111-1111-4111-8111-111111111111",
        linkId: "33333333-3333-4333-8333-333333333333",
        position: 0,
      },
      {
        id: "bl-1",
        boardId: "11111111-1111-4111-8111-111111111111",
        linkId: "22222222-2222-4222-8222-222222222222",
        position: 1,
      },
    ]);

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/boards/11111111-1111-4111-8111-111111111111/links/reorder", {
        method: "PATCH",
        body: JSON.stringify({
          linkIds: [
            "33333333-3333-4333-8333-333333333333",
            "22222222-2222-4222-8222-222222222222",
          ],
        }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    );

    expect(response.status).toBe(200);
    expect(boardLinksModule.reorderBoardLinks).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", [
      "33333333-3333-4333-8333-333333333333",
      "22222222-2222-4222-8222-222222222222",
    ]);
    await expect(response.json()).resolves.toEqual({
      data: [
        {
          id: "bl-2",
          boardId: "11111111-1111-4111-8111-111111111111",
          linkId: "33333333-3333-4333-8333-333333333333",
          position: 0,
        },
        {
          id: "bl-1",
          boardId: "11111111-1111-4111-8111-111111111111",
          linkId: "22222222-2222-4222-8222-222222222222",
          position: 1,
        },
      ],
    });
  });

  it("reorders board links with api key auth", async () => {
    mockedAuthenticateApiKey.mockResolvedValue({ userId: "user-123", apiKeyId: "key-123" });
    vi.mocked(boardsModule.findBoardSummaryById).mockResolvedValue(buildBoard());
    vi.mocked(boardLinksModule.getBoardLinksWithMetadata).mockResolvedValue([
      buildBoardLink("bl-1", "22222222-2222-4222-8222-222222222222", 0),
    ]);
    vi.mocked(boardLinksModule.reorderBoardLinks).mockResolvedValue([
      {
        id: "bl-1",
        boardId: "11111111-1111-4111-8111-111111111111",
        linkId: "22222222-2222-4222-8222-222222222222",
        position: 0,
      },
    ]);

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/boards/11111111-1111-4111-8111-111111111111/links/reorder", {
        method: "PATCH",
        headers: { authorization: "Bearer lb_secret" },
        body: JSON.stringify({
          linkIds: ["22222222-2222-4222-8222-222222222222"],
        }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    );

    expect(response.status).toBe(200);
    expect(mockedAuth).not.toHaveBeenCalled();
  });

  it("returns 404 when the board is not owned by the session user", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(boardsModule.findBoardSummaryById).mockResolvedValue(buildBoard({ userId: "user-999" }));

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/boards/11111111-1111-4111-8111-111111111111/links/reorder", {
        method: "PATCH",
        body: JSON.stringify({
          linkIds: ["22222222-2222-4222-8222-222222222222"],
        }),
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

  it("returns 400 for invalid reorder payloads", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/boards/11111111-1111-4111-8111-111111111111/links/reorder", {
        method: "PATCH",
        body: JSON.stringify({ linkIds: [] }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid board link reorder input",
        details: {
          fields: {
            linkIds: "Select at least one link",
          },
        },
      },
    });
  });

  it("returns 400 when submitted link ids do not match the board contents", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(boardsModule.findBoardSummaryById).mockResolvedValue(buildBoard());
    vi.mocked(boardLinksModule.getBoardLinksWithMetadata).mockResolvedValue([
      buildBoardLink("bl-1", "22222222-2222-4222-8222-222222222222", 0),
      buildBoardLink("bl-2", "33333333-3333-4333-8333-333333333333", 1),
    ]);

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/boards/11111111-1111-4111-8111-111111111111/links/reorder", {
        method: "PATCH",
        body: JSON.stringify({
          linkIds: [
            "22222222-2222-4222-8222-222222222222",
            "22222222-2222-4222-8222-222222222222",
          ],
        }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "BAD_REQUEST",
        message: "Reorder payload must include each board link exactly once",
      },
    });
    expect(boardLinksModule.reorderBoardLinks).not.toHaveBeenCalled();
  });

  it("returns 401 for invalid api keys", async () => {
    mockedAuthenticateApiKey.mockResolvedValue(null);
    mockedAuth.mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/boards/11111111-1111-4111-8111-111111111111/links/reorder", {
        method: "PATCH",
        headers: { authorization: "Bearer invalid" },
        body: JSON.stringify({
          linkIds: ["22222222-2222-4222-8222-222222222222"],
        }),
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
