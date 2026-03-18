// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMock, setexMock, warnMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  setexMock: vi.fn(),
  warnMock: vi.fn(),
}));

vi.mock("@/lib/cache/client", () => ({
  redis: {
    get: getMock,
    setex: setexMock,
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

const { getRedirectCache, setRedirectCache, REDIRECT_CACHE_TTL_SECONDS } = await import("./redirect");

describe("src/lib/cache/redirect.ts", () => {
  beforeEach(() => {
    getMock.mockReset();
    setexMock.mockReset();
    warnMock.mockReset();
  });

  it("returns parsed redirect cache entries", async () => {
    getMock.mockResolvedValue(
      JSON.stringify({
        targetUrl: "https://example.com/docs",
        linkId: "link-123",
        expiresAt: "2026-03-20T00:00:00.000Z",
      }),
    );

    await expect(getRedirectCache("docs")).resolves.toEqual({
      targetUrl: "https://example.com/docs",
      linkId: "link-123",
      expiresAt: "2026-03-20T00:00:00.000Z",
    });
    expect(getMock).toHaveBeenCalledWith("slug:docs");
  });

  it("returns null when cache entry is missing", async () => {
    getMock.mockResolvedValue(null);

    await expect(getRedirectCache("missing")).resolves.toBeNull();
  });

  it("returns null and logs when redis get fails", async () => {
    const error = new Error("redis down");
    getMock.mockRejectedValue(error);

    await expect(getRedirectCache("docs")).resolves.toBeNull();
    expect(warnMock).toHaveBeenCalledWith("redirect_cache.get_failed", {
      slug: "docs",
      error,
    });
  });

  it("stores redirect cache entries with the expected ttl", async () => {
    setexMock.mockResolvedValue("OK");

    await setRedirectCache("docs", {
      targetUrl: "https://example.com/docs",
      linkId: "link-123",
      expiresAt: null,
    });

    expect(setexMock).toHaveBeenCalledWith(
      "slug:docs",
      REDIRECT_CACHE_TTL_SECONDS,
      JSON.stringify({
        targetUrl: "https://example.com/docs",
        linkId: "link-123",
        expiresAt: null,
      }),
    );
  });

  it("does not throw when redis set fails", async () => {
    const error = new Error("write failed");
    setexMock.mockRejectedValue(error);

    await expect(
      setRedirectCache("docs", {
        targetUrl: "https://example.com/docs",
        linkId: "link-123",
        expiresAt: null,
      }),
    ).resolves.toBeUndefined();
    expect(warnMock).toHaveBeenCalledWith("redirect_cache.set_failed", {
      slug: "docs",
      error,
    });
  });
});
