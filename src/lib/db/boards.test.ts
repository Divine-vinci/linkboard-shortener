// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyMock, findUniqueMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  findUniqueMock: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    board: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
    },
  },
}));

const { findBoardById, findBoardsByUserId } = await import("./boards");

describe("src/lib/db/boards.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findBoardsByUserId returns only the user's boards ordered by name", async () => {
    findManyMock.mockResolvedValue([{ id: "board-1", name: "Ideas" }]);

    await expect(findBoardsByUserId("user-123")).resolves.toEqual([{ id: "board-1", name: "Ideas" }]);
    expect(findManyMock).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    });
  });

  it("findBoardById returns the matched board", async () => {
    findUniqueMock.mockResolvedValue({ id: "board-123", userId: "user-123" });

    await expect(findBoardById("board-123")).resolves.toEqual({ id: "board-123", userId: "user-123" });
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "board-123" },
    });
  });

  it("findBoardById returns null when the board is missing", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(findBoardById("missing-board")).resolves.toBeNull();
  });
});
