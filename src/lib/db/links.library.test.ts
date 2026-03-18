// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, count } = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
}));

vi.mock("@/lib/cache/invalidation", () => ({
  invalidateRedirectCache: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    link: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany,
      count,
    },
  },
}));

const { buildLinkLibraryWhereClause, findLinksForLibrary } = await import("@/lib/db/links");

describe("findLinksForLibrary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds search and tag filters across supported fields", async () => {
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);

    await findLinksForLibrary({
      userId: "user-123",
      query: "Docs",
      tag: "Launch",
      page: 2,
      limit: 20,
    });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-123",
        OR: [
          { title: { contains: "Docs", mode: "insensitive" } },
          { slug: { contains: "Docs", mode: "insensitive" } },
          { targetUrl: { contains: "Docs", mode: "insensitive" } },
          { tags: { has: "docs" } },
        ],
        tags: { has: "launch" },
      },
      orderBy: { createdAt: "desc" },
      skip: 20,
      take: 20,
    });
    expect(count).toHaveBeenCalledWith({
      where: {
        userId: "user-123",
        OR: [
          { title: { contains: "Docs", mode: "insensitive" } },
          { slug: { contains: "Docs", mode: "insensitive" } },
          { targetUrl: { contains: "Docs", mode: "insensitive" } },
          { tags: { has: "docs" } },
        ],
        tags: { has: "launch" },
      },
    });
  });

  it("returns links and total for empty results without filters", async () => {
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);

    await expect(findLinksForLibrary({ userId: "user-123" })).resolves.toEqual({
      links: [],
      total: 0,
    });
  });

  it("exposes the where-clause builder for reuse", () => {
    expect(buildLinkLibraryWhereClause({ userId: "user-123", query: " launch ", tag: "Docs" })).toEqual({
      userId: "user-123",
      OR: [
        { title: { contains: "launch", mode: "insensitive" } },
        { slug: { contains: "launch", mode: "insensitive" } },
        { targetUrl: { contains: "launch", mode: "insensitive" } },
        { tags: { has: "launch" } },
      ],
      tags: { has: "docs" },
    });
  });
});
