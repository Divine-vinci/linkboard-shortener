// @vitest-environment node

import { BoardVisibility } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { countMock, createMock, findManyMock, findUniqueMock, randomBytesMock } = vi.hoisted(() => ({
  countMock: vi.fn(),
  createMock: vi.fn(),
  findManyMock: vi.fn(),
  findUniqueMock: vi.fn(),
  randomBytesMock: vi.fn(),
}));

vi.mock("node:crypto", () => ({
  randomBytes: randomBytesMock,
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    board: {
      count: countMock,
      create: createMock,
      findMany: findManyMock,
      findUnique: findUniqueMock,
    },
  },
}));

const {
  countBoardsByUserId,
  createBoard,
  createBoardSlug,
  findBoardById,
  findBoardBySlug,
  findBoardsByUserId,
} = await import("./boards");

describe("src/lib/db/boards.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findBoardsByUserId returns only the user's boards ordered by name", async () => {
    findManyMock.mockResolvedValue([{ id: "board-1", name: "Ideas", _count: { boardLinks: 0 } }]);

    await expect(findBoardsByUserId("user-123")).resolves.toEqual([
      { id: "board-1", name: "Ideas", _count: { boardLinks: 0 } },
    ]);
    expect(findManyMock).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
      include: {
        _count: {
          select: {
            boardLinks: true,
          },
        },
      },
    });
  });

  it("findBoardsByUserId applies pagination when provided", async () => {
    findManyMock.mockResolvedValue([]);

    await findBoardsByUserId("user-123", { limit: 10, offset: 20 });

    expect(findManyMock).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
      include: {
        _count: {
          select: {
            boardLinks: true,
          },
        },
      },
      skip: 20,
      take: 10,
    });
  });

  it("countBoardsByUserId returns the user's total board count", async () => {
    countMock.mockResolvedValue(3);

    await expect(countBoardsByUserId("user-123")).resolves.toBe(3);
    expect(countMock).toHaveBeenCalledWith({ where: { userId: "user-123" } });
  });

  it("findBoardById returns the matched board", async () => {
    findUniqueMock.mockResolvedValue({ id: "board-123", userId: "user-123" });

    await expect(findBoardById("board-123")).resolves.toEqual({ id: "board-123", userId: "user-123" });
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "board-123" },
      include: {
        _count: {
          select: {
            boardLinks: true,
          },
        },
        boardLinks: {
          include: {
            link: true,
          },
          orderBy: {
            position: "asc",
          },
        },
      },
    });
  });

  it("findBoardById returns null when the board is missing", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(findBoardById("missing-board")).resolves.toBeNull();
  });

  it("findBoardBySlug returns the matched board", async () => {
    findUniqueMock.mockResolvedValue({ id: "board-123", slug: "ideas" });

    await expect(findBoardBySlug("ideas")).resolves.toEqual({ id: "board-123", slug: "ideas" });
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { slug: "ideas" },
    });
  });

  it("createBoardSlug normalizes names into max-60-char slugs", () => {
    expect(createBoardSlug("  Product Launch Board!!!  ")).toBe("product-launch-board");
    expect(createBoardSlug("A".repeat(80))).toHaveLength(60);
  });

  it("createBoard creates a board with a generated slug", async () => {
    createMock.mockResolvedValue({ id: "board-1", slug: "product-launch" });

    await expect(
      createBoard({
        name: "Product Launch",
        description: "Launch assets",
        visibility: BoardVisibility.Public,
        userId: "user-123",
      }),
    ).resolves.toEqual({ id: "board-1", slug: "product-launch" });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        name: "Product Launch",
        description: "Launch assets",
        visibility: BoardVisibility.Public,
        userId: "user-123",
        slug: "product-launch",
      },
    });
  });

  it("createBoard appends a suffix when the base slug collides via P2002", async () => {
    randomBytesMock.mockReturnValue({ toString: () => "1a2b" });
    createMock
      .mockRejectedValueOnce(Object.assign(new Error("duplicate"), { code: "P2002" }))
      .mockResolvedValueOnce({ id: "board-2", slug: "product-launch-1a2b" });

    await expect(
      createBoard({
        name: "Product Launch",
        visibility: BoardVisibility.Private,
        userId: "user-123",
      }),
    ).resolves.toEqual({ id: "board-2", slug: "product-launch-1a2b" });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        name: "Product Launch",
        description: undefined,
        visibility: BoardVisibility.Private,
        userId: "user-123",
        slug: "product-launch-1a2b",
      },
    });
  });

  it("createBoard retries when Prisma raises a unique constraint collision", async () => {
    randomBytesMock.mockReturnValue({ toString: () => "9f0e" });
    createMock
      .mockRejectedValueOnce(Object.assign(new Error("duplicate"), { code: "P2002" }))
      .mockResolvedValueOnce({ id: "board-3", slug: "ideas-9f0e" });

    await expect(
      createBoard({
        name: "Ideas",
        visibility: BoardVisibility.Unlisted,
        userId: "user-123",
      }),
    ).resolves.toEqual({ id: "board-3", slug: "ideas-9f0e" });
  });

  it("createBoard throws after exhausting all 3 retry attempts", async () => {
    randomBytesMock.mockReturnValue({ toString: () => "abcd" });
    const p2002 = Object.assign(new Error("duplicate"), { code: "P2002" });
    createMock.mockRejectedValue(p2002);

    await expect(
      createBoard({
        name: "Contested",
        visibility: BoardVisibility.Public,
        userId: "user-123",
      }),
    ).rejects.toThrow("duplicate");

    expect(createMock).toHaveBeenCalledTimes(3);
  });
});
