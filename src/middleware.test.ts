// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getTokenMock,
  getRedirectCacheMock,
  setRedirectCacheMock,
  findLinkBySlugMock,
  captureClickEventMock,
  infoMock,
  warnMock,
  waitUntilMock,
} = vi.hoisted(() => ({
  getTokenMock: vi.fn(),
  getRedirectCacheMock: vi.fn(),
  setRedirectCacheMock: vi.fn(),
  findLinkBySlugMock: vi.fn(),
  captureClickEventMock: vi.fn(),
  infoMock: vi.fn(),
  warnMock: vi.fn(),
  waitUntilMock: vi.fn(),
}));

vi.mock("next-auth/jwt", () => ({
  getToken: getTokenMock,
}));

vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    waitUntil: waitUntilMock,
  };
});

vi.mock("@/lib/cache/redirect", () => ({
  getRedirectCache: getRedirectCacheMock,
  setRedirectCache: setRedirectCacheMock,
}));

vi.mock("@/lib/db/links", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db/links")>("@/lib/db/links");
  return {
    ...actual,
    findLinkBySlug: findLinkBySlugMock,
  };
});

vi.mock("@/lib/analytics/capture", () => ({
  captureClickEvent: captureClickEventMock,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: infoMock,
    warn: warnMock,
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

const { middleware, config, resolveAuthRedirect } = await import("./middleware");

function createRequest(pathname: string) {
  return {
    url: `http://localhost:3000${pathname}`,
    nextUrl: { pathname },
    headers: new Headers(),
  };
}

describe("src/middleware.ts", () => {
  beforeEach(() => {
    getTokenMock.mockReset();
    getRedirectCacheMock.mockReset();
    setRedirectCacheMock.mockReset();
    findLinkBySlugMock.mockReset();
    captureClickEventMock.mockReset();
    infoMock.mockReset();
    warnMock.mockReset();
    waitUntilMock.mockReset();
    getTokenMock.mockResolvedValue(null);
    getRedirectCacheMock.mockResolvedValue(null);
    setRedirectCacheMock.mockResolvedValue(undefined);
    findLinkBySlugMock.mockResolvedValue(null);
    captureClickEventMock.mockResolvedValue(undefined);
    waitUntilMock.mockReturnValue(undefined);
  });

  it("redirects on cache hit with a 301 response", async () => {
    getRedirectCacheMock.mockResolvedValue({
      targetUrl: "https://example.com/docs",
      linkId: "link-123",
      expiresAt: null,
    });

    const request = createRequest("/docs");
    const response = await middleware(request as never);

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://example.com/docs");
    expect(findLinkBySlugMock).not.toHaveBeenCalled();
    expect(captureClickEventMock).toHaveBeenCalledWith("link-123", request);
    expect(waitUntilMock).toHaveBeenCalledWith(expect.any(Promise));
    expect(infoMock).toHaveBeenCalledWith("redirect.cache_hit", { slug: "docs" });
  });

  it("redirects on cache miss, queries the db, populates cache, and schedules analytics", async () => {
    findLinkBySlugMock.mockResolvedValue({
      id: "link-123",
      slug: "docs",
      targetUrl: "https://example.com/docs",
      expiresAt: null,
    });

    const request = createRequest("/docs");
    const response = await middleware(request as never);

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://example.com/docs");
    expect(findLinkBySlugMock).toHaveBeenCalledWith("docs");
    expect(setRedirectCacheMock).toHaveBeenCalledWith("docs", {
      targetUrl: "https://example.com/docs",
      linkId: "link-123",
      expiresAt: null,
    });
    expect(captureClickEventMock).toHaveBeenCalledWith("link-123", request);
    expect(waitUntilMock).toHaveBeenCalledWith(expect.any(Promise));
    expect(infoMock).toHaveBeenCalledWith("redirect.cache_miss", { slug: "docs" });
  });

  it("passes through expired links from cache to the expired page", async () => {
    getRedirectCacheMock.mockResolvedValue({
      targetUrl: "https://example.com/docs",
      linkId: "link-123",
      expiresAt: "2020-01-01T00:00:00.000Z",
    });

    const response = await middleware(createRequest("/docs") as never);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/expired");
    expect(findLinkBySlugMock).not.toHaveBeenCalled();
    expect(captureClickEventMock).not.toHaveBeenCalled();
    expect(waitUntilMock).not.toHaveBeenCalled();
    expect(warnMock).toHaveBeenCalledWith("redirect.expired", { slug: "docs" });
  });

  it("redirects expired DB-hit links to expired page without capturing analytics", async () => {
    findLinkBySlugMock.mockResolvedValue({
      id: "link-expired",
      slug: "old",
      targetUrl: "https://example.com/old",
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
    });

    const response = await middleware(createRequest("/old") as never);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/expired");
    expect(captureClickEventMock).not.toHaveBeenCalled();
    expect(waitUntilMock).not.toHaveBeenCalled();
    expect(warnMock).toHaveBeenCalledWith("redirect.expired", { slug: "old" });
  });

  it("passes through non-existent slugs to next routing", async () => {
    const response = await middleware(createRequest("/missing") as never);

    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(findLinkBySlugMock).toHaveBeenCalledWith("missing");
    expect(waitUntilMock).not.toHaveBeenCalled();
  });

  it("does not intercept reserved paths", async () => {
    const response = await middleware(createRequest("/api/links") as never);

    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(getRedirectCacheMock).not.toHaveBeenCalled();
    expect(findLinkBySlugMock).not.toHaveBeenCalled();
    expect(waitUntilMock).not.toHaveBeenCalled();
  });

  it("keeps auth redirects for protected routes", async () => {
    const response = await middleware(createRequest("/dashboard") as never);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("exports a matcher that includes slug paths", () => {
    expect(config.matcher).toEqual(["/dashboard/:path*", "/login", "/:slug"]);
  });

  it("keeps resolveAuthRedirect behavior intact", () => {
    expect(resolveAuthRedirect("/dashboard", false)).toBe("/login");
    expect(resolveAuthRedirect("/login", true)).toBe("/dashboard");
    expect(resolveAuthRedirect("/docs", false)).toBeNull();
  });
});
