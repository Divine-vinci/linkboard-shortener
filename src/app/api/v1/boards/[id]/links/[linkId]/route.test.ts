// @vitest-environment node

import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(),
}));

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
const boardLinksModule = await import("@/lib/db/board-links");
const boardsModule = await import("@/lib/db/boards");
const clientModule = await import("@/lib/db/client");

const mockedAuth = authModule.auth as Mock;

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
});
