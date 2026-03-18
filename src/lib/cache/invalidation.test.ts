// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { delMock, warnMock } = vi.hoisted(() => ({
  delMock: vi.fn(),
  warnMock: vi.fn(),
}));

vi.mock("@/lib/cache/client", () => ({
  redis: {
    del: delMock,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: warnMock,
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

const { invalidateRedirectCache } = await import("./invalidation");

describe("src/lib/cache/invalidation.ts", () => {
  beforeEach(() => {
    delMock.mockReset();
    warnMock.mockReset();
  });

  it("deletes the slug cache key", async () => {
    delMock.mockResolvedValue(1);

    await invalidateRedirectCache("docs");

    expect(delMock).toHaveBeenCalledWith("slug:docs");
  });

  it("does not throw when redis delete fails", async () => {
    const error = new Error("delete failed");
    delMock.mockRejectedValue(error);

    await expect(invalidateRedirectCache("docs")).resolves.toBeUndefined();
    expect(warnMock).toHaveBeenCalledWith("redirect_cache.invalidate_failed", {
      slug: "docs",
      error,
    });
  });
});
