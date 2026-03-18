// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMock, deleteMock, findFirstMock, findManyMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  deleteMock: vi.fn(),
  findFirstMock: vi.fn(),
  findManyMock: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    apiKey: {
      create: createMock,
      delete: deleteMock,
      findFirst: findFirstMock,
      findMany: findManyMock,
    },
  },
}));

const { createApiKey, deleteApiKey, findApiKeyByHash, findApiKeyById, findApiKeysByUserId } = await import("./api-keys");

describe("src/lib/db/api-keys.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an API key row and returns the safe create payload", async () => {
    const createdAt = new Date("2026-03-18T20:00:00.000Z");
    createMock.mockResolvedValue({ id: "key-123", name: "Deploy", keyPrefix: "lb_abcd", createdAt });

    await expect(
      createApiKey({
        userId: "user-123",
        name: "Deploy",
        keyHash: "hash-123",
        keyPrefix: "lb_abcd",
      }),
    ).resolves.toEqual({ id: "key-123", name: "Deploy", keyPrefix: "lb_abcd", createdAt });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        userId: "user-123",
        name: "Deploy",
        keyHash: "hash-123",
        keyPrefix: "lb_abcd",
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        createdAt: true,
      },
    });
  });

  it("lists a user's keys newest first without returning hashes", async () => {
    findManyMock.mockResolvedValue([{ id: "key-123", name: "Deploy", keyPrefix: "lb_abcd", createdAt: new Date(), lastUsedAt: null }]);

    await findApiKeysByUserId("user-123");

    expect(findManyMock).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });
  });

  it("finds a key by id scoped to the owner without returning hash", async () => {
    findFirstMock.mockResolvedValue({
      id: "key-123",
      userId: "user-123",
      name: "Deploy",
      keyPrefix: "lb_abcd",
      createdAt: new Date("2026-03-18T20:00:00.000Z"),
      lastUsedAt: null,
    });

    await expect(findApiKeyById("key-123", "user-123")).resolves.toMatchObject({
      id: "key-123",
      userId: "user-123",
    });
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "key-123", userId: "user-123" },
      select: {
        id: true,
        userId: true,
        name: true,
        keyPrefix: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });
  });

  it("finds a key by hash for auth verification", async () => {
    findFirstMock.mockResolvedValue({
      id: "key-123",
      userId: "user-123",
      keyHash: "hash-123",
    });

    await expect(findApiKeyByHash("hash-123")).resolves.toMatchObject({
      id: "key-123",
      userId: "user-123",
      keyHash: "hash-123",
    });
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { keyHash: "hash-123" },
      select: {
        id: true,
        userId: true,
        keyHash: true,
      },
    });
  });

  it("deletes only owned keys", async () => {
    findFirstMock.mockResolvedValueOnce({ id: "key-123" });
    deleteMock.mockResolvedValue({ id: "key-123" });

    await expect(deleteApiKey("key-123", "user-123")).resolves.toBe(true);
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "key-123" } });
  });

  it("returns false when deleting a missing or foreign key", async () => {
    findFirstMock.mockResolvedValue(null);

    await expect(deleteApiKey("key-404", "user-123")).resolves.toBe(false);
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
