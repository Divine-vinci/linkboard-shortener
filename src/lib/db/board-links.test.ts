// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { aggregateMock, createMock } = vi.hoisted(() => ({
  aggregateMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    boardLink: {
      aggregate: aggregateMock,
      create: createMock,
    },
  },
}));

const { addLinkToBoard, getNextBoardLinkPosition } = await import("./board-links");

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
});
