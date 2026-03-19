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
  recompactBoardLinkPositions: vi.fn(),
  removeLinkFromBoard: vi.fn(),
}));

vi.mock("@/lib/db/boards", () => ({
  findBoardSummaryById: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    boardLink: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const { DELETE } = await import("@/app/api/v1/boards/[id]/links/[linkId]/route");
const authModule = await import("@/lib/auth/config");
const apiKeyAuthModule = await import("@/lib/auth/api-key-middleware");
const boardLinksModule = await import("@/lib/db/board-links");
const boardsModule = await import("@/lib/db/boards");
const clientModule = await import("@/lib/db/client");

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

describe("DELETE src/app/api/v1/boards/[id]/links/[linkId]/route.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuthenticateApiKey.mockResolvedValue(null);
  });

  it("removes a board-link and recompacts positions", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(boardsModule.findBoardSummaryById).mockResolvedValue(buildBoard());
    vi.mocked(clientModule.prisma.boardLink.findUnique as Mock).mockResolvedValue({
      id: "bl-123",
      boardId: "11111111-1111-4111-8111-111111111111",
      linkId: "22222222-2222-4222-8222-222222222222",
      position: 0,
    });
    vi.mocked(clientModule.prisma.$transaction as Mock).mockImplementation(async (callback) =>
      callback({ boardLink: {} }),
    );

    const response = await DELETE(
      new Request("http://localhost:3000/api/v1/boards/11111111-1111-4111-8111-111111111111/links/22222222-2222-4222-8222-222222222222", {
        method: "DELETE",
      }),
      {
        params: Promise.resolve({
          id: "11111111-1111-4111-8111-111111111111",
          linkId: "22222222-2222-4222-8222-222222222222",
        }),
      },
    );

    expect(response.status).toBe(204);
    expect(boardLinksModule.removeLinkFromBoard).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      expect.anything(),
    );
    expect(boardLinksModule.recompactBoardLinkPositions).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      expect.anything(),
    );
  });

  it("removes a board-link with api key auth", async () => {
    mockedAuthenticateApiKey.mockResolvedValue({ userId: "user-123", apiKeyId: "key-123" });
    vi.mocked(boardsModule.findBoardSummaryById).mockResolvedValue(buildBoard());
    vi.mocked(clientModule.prisma.boardLink.findUnique as Mock).mockResolvedValue({
      id: "bl-123",
      boardId: "11111111-1111-4111-8111-111111111111",
      linkId: "22222222-2222-4222-8222-222222222222",
      position: 0,
    });
    vi.mocked(clientModule.prisma.$transaction as Mock).mockImplementation(async (callback) =>
      callback({ boardLink: {} }),
    );

    const response = await DELETE(
      new Request("http://localhost:3000/api/v1/boards/11111111-1111-4111-8111-111111111111/links/22222222-2222-4222-8222-222222222222", {
        method: "DELETE",
        headers: { authorization: "Bearer lb_secret" },
      }),
      {
        params: Promise.resolve({
          id: "11111111-1111-4111-8111-111111111111",
          linkId: "22222222-2222-4222-8222-222222222222",
        }),
      },
    );

    expect(response.status).toBe(204);
    expect(mockedAuth).not.toHaveBeenCalled();
    expect(clientModule.prisma.boardLink.findUnique).toHaveBeenCalledWith({
      where: {
        boardId_linkId: {
          boardId: "11111111-1111-4111-8111-111111111111",
          linkId: "22222222-2222-4222-8222-222222222222",
        },
      },
    });
    expect(clientModule.prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
    );
  });

  it("returns 404 when deleting from another user's board", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(boardsModule.findBoardSummaryById).mockResolvedValue(buildBoard({ userId: "user-999" }));

    const response = await DELETE(
      new Request("http://localhost:3000/api/v1/boards/11111111-1111-4111-8111-111111111111/links/22222222-2222-4222-8222-222222222222", {
        method: "DELETE",
      }),
      {
        params: Promise.resolve({
          id: "11111111-1111-4111-8111-111111111111",
          linkId: "22222222-2222-4222-8222-222222222222",
        }),
      },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Board not found",
      },
    });
  });

  it("returns 404 when the link is not on the board", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(boardsModule.findBoardSummaryById).mockResolvedValue(buildBoard());
    vi.mocked(clientModule.prisma.boardLink.findUnique as Mock).mockResolvedValue(null);

    const response = await DELETE(
      new Request("http://localhost:3000/api/v1/boards/11111111-1111-4111-8111-111111111111/links/22222222-2222-4222-8222-222222222222", {
        method: "DELETE",
      }),
      {
        params: Promise.resolve({
          id: "11111111-1111-4111-8111-111111111111",
          linkId: "22222222-2222-4222-8222-222222222222",
        }),
      },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Link not found on board",
      },
    });
    expect(clientModule.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns 401 for invalid api keys", async () => {
    mockedAuthenticateApiKey.mockResolvedValue(null);
    mockedAuth.mockResolvedValue(null);

    const response = await DELETE(
      new Request("http://localhost:3000/api/v1/boards/11111111-1111-4111-8111-111111111111/links/22222222-2222-4222-8222-222222222222", {
        method: "DELETE",
        headers: { authorization: "Bearer invalid" },
      }),
      {
        params: Promise.resolve({
          id: "11111111-1111-4111-8111-111111111111",
          linkId: "22222222-2222-4222-8222-222222222222",
        }),
      },
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
