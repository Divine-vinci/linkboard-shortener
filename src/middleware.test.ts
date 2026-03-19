// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { getTokenMock } = vi.hoisted(() => ({
  getTokenMock: vi.fn(),
}));

vi.mock("next-auth/jwt", () => ({
  getToken: getTokenMock,
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
    getTokenMock.mockResolvedValue(null);
  });

  it("redirects unauthenticated users away from protected dashboard routes", async () => {
    const response = await middleware(createRequest("/dashboard") as never);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("redirects authenticated users away from the login page", async () => {
    getTokenMock.mockResolvedValue({ sub: "user-123" });

    const response = await middleware(createRequest("/login") as never);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("passes through non-protected routes", async () => {
    const response = await middleware(createRequest("/docs") as never);

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("exports an auth-only matcher", () => {
    expect(config.matcher).toEqual(["/dashboard/:path*", "/login"]);
  });

  it("keeps resolveAuthRedirect behavior intact", () => {
    expect(resolveAuthRedirect("/dashboard", false)).toBe("/login");
    expect(resolveAuthRedirect("/login", true)).toBe("/dashboard");
    expect(resolveAuthRedirect("/docs", false)).toBeNull();
  });
});
