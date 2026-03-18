// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { aggregateMock, createMock, deleteMock, findManyMock, updateMock } = vi.hoisted(() => ({
  aggregateMock: vi.fn(),
  createMock: vi.fn(),
  deleteMock: vi.fn(),
  findManyMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    boardLink: {
      aggregate: aggregateMock,
      create: createMock,
      delete: deleteMock,
      findMany: findManyMock,
      update: updateMock,
    },
  },
}));

const {
  addLinkToBoard,
  getBoardLinksWithMetadata,
  getNextBoardLinkPosition,
  recompactBoardLinkPositions,
  removeLinkFromBoard,
} = await import("./board-links");

describe("src/lib/db/board-links.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getNextBoardLinkPosition returns 0 for an empty board", async () => {
    aggregateMock.mockResolvedValue({ _max: { position: null } });

    await expect(getNextBoardLinkPosition("board-123")).resolves.toBe(0);
    expect(aggregateMock).toHaveBeenCalledWith({
      where: { boardId: "board-123" },
      _max: { position: true },
    });
  });

  it("addLinkToBoard stores the next available position", async () => {
    aggregateMock.mockResolvedValue({ _max: { position: 2 } });
    createMock.mockResolvedValue({ id: "board-link-123", position: 3 });

    await expect(addLinkToBoard({ boardId: "board-123", linkId: "link-123" })).resolves.toEqual({
      id: "board-link-123",
      position: 3,
    });
    expect(createMock).toHaveBeenCalledWith({
      data: {
        boardId: "board-123",
        linkId: "link-123",
        position: 3,
      },
    });
  });

  it("surfaces unique constraint failures for duplicate board links", async () => {
    aggregateMock.mockResolvedValue({ _max: { position: 0 } });
    const duplicateError = Object.assign(new Error("duplicate"), { code: "P2002" });
    createMock.mockRejectedValue(duplicateError);

    await expect(addLinkToBoard({ boardId: "board-123", linkId: "link-123" })).rejects.toMatchObject({ code: "P2002" });
  });

  it("removes a board link by composite key", async () => {
    deleteMock.mockResolvedValue({ id: "board-link-123" });

    await expect(removeLinkFromBoard("board-123", "link-123")).resolves.toEqual({ id: "board-link-123" });
    expect(deleteMock).toHaveBeenCalledWith({
      where: {
        boardId_linkId: {
          boardId: "board-123",
          linkId: "link-123",
        },
      },
    });
  });

  it("recompacts positions after removal", async () => {
    findManyMock.mockResolvedValue([
      { id: "bl-1", position: 0 },
      { id: "bl-2", position: 2 },
      { id: "bl-3", position: 4 },
    ]);
    updateMock.mockResolvedValue({});

    await recompactBoardLinkPositions("board-123");

    expect(findManyMock).toHaveBeenCalledWith({
      where: { boardId: "board-123" },
      orderBy: { position: "asc" },
      select: {
        id: true,
        position: true,
      },
    });
    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(updateMock).toHaveBeenNthCalledWith(1, {
      where: { id: "bl-2" },
      data: { position: 1 },
    });
    expect(updateMock).toHaveBeenNthCalledWith(2, {
      where: { id: "bl-3" },
      data: { position: 2 },
    });
  });

  it("returns ordered board links with link metadata", async () => {
    const boardLinks = [
      {
        id: "bl-1",
        boardId: "board-123",
        linkId: "link-123",
        position: 0,
        addedAt: new Date("2026-03-18T00:00:00.000Z"),
        link: {
          id: "link-123",
          slug: "launch-docs",
          targetUrl: "https://example.com/docs",
          title: "Launch docs",
          description: null,
          tags: ["docs"],
          expiresAt: null,
          userId: "user-123",
          createdAt: new Date("2026-03-18T00:00:00.000Z"),
          updatedAt: new Date("2026-03-18T00:00:00.000Z"),
        },
      },
    ];
    findManyMock.mockResolvedValue(boardLinks);

    await expect(getBoardLinksWithMetadata("board-123")).resolves.toEqual(boardLinks);
    expect(findManyMock).toHaveBeenCalledWith({
      where: { boardId: "board-123" },
      orderBy: { position: "asc" },
      include: {
        link: true,
      },
    });
  });
});
