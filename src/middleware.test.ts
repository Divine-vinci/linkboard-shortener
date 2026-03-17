import { describe, expect, it } from "vitest";

import { resolveAuthRedirect } from "@/middleware";

describe("src/middleware.ts", () => {
  it("redirects unauthenticated dashboard requests to /login", () => {
    expect(resolveAuthRedirect("/dashboard", false)).toBe("/login");
    expect(resolveAuthRedirect("/dashboard/boards", false)).toBe("/login");
  });

  it("redirects authenticated users away from /login", () => {
    expect(resolveAuthRedirect("/login", true)).toBe("/dashboard");
  });

  it("allows public or already-authorized requests", () => {
    expect(resolveAuthRedirect("/register", false)).toBeNull();
    expect(resolveAuthRedirect("/dashboard", true)).toBeNull();
    expect(resolveAuthRedirect("/", false)).toBeNull();
  });
});
