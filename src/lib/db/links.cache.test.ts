// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirstMock, updateMock, deleteMock, createMock, invalidateMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
  createMock: vi.fn(),
  invalidateMock: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    link: {
      create: createMock,
      findFirst: findFirstMock,
      update: updateMock,
      delete: deleteMock,
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/cache/invalidation", () => ({
  invalidateRedirectCache: invalidateMock,
}));

const { createLink, deleteLink, updateLink } = await import("./links");

describe("src/lib/db/links.ts cache invalidation", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
    createMock.mockReset();
    invalidateMock.mockReset();
  });

  it("invalidates redirect cache after updateLink succeeds", async () => {
    findFirstMock.mockResolvedValue({ id: "link-123", userId: "user-123", slug: "docs" });
    updateMock.mockResolvedValue({ id: "link-123", slug: "docs", targetUrl: "https://example.com/updated" });

    await expect(updateLink("link-123", "user-123", { targetUrl: "https://example.com/updated" })).resolves.toMatchObject({
      id: "link-123",
      slug: "docs",
    });
    expect(invalidateMock).toHaveBeenCalledWith("docs");
  });

  it("does not invalidate when updateLink cannot find an owned link", async () => {
    findFirstMock.mockResolvedValue(null);

    await expect(updateLink("link-123", "user-123", { title: "Nope" })).resolves.toBeNull();
    expect(invalidateMock).not.toHaveBeenCalled();
  });

  it("invalidates redirect cache after deleteLink succeeds", async () => {
    findFirstMock.mockResolvedValue({ id: "link-123", userId: "user-123", slug: "docs" });
    deleteMock.mockResolvedValue({ id: "link-123" });

    await expect(deleteLink("link-123", "user-123")).resolves.toBe(true);
    expect(invalidateMock).toHaveBeenCalledWith("docs");
  });

  it("does not invalidate when deleteLink cannot find an owned link", async () => {
    findFirstMock.mockResolvedValue(null);

    await expect(deleteLink("link-123", "user-123")).resolves.toBe(false);
    expect(invalidateMock).not.toHaveBeenCalled();
  });

  it("does not prewarm cache on createLink", async () => {
    createMock.mockResolvedValue({ id: "link-123", slug: "docs" });

    await createLink({ slug: "docs", targetUrl: "https://example.com/docs", userId: "user-123" });

    expect(invalidateMock).not.toHaveBeenCalled();
  });
});
