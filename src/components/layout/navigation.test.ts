import { describe, expect, it } from "vitest";

import { isNavigationItemActive } from "@/components/layout/navigation";

describe("src/components/layout/navigation.ts — isNavigationItemActive", () => {
  it("returns true for exact /dashboard match", () => {
    expect(isNavigationItemActive("/dashboard", "/dashboard")).toBe(true);
  });

  it("returns false for /dashboard when on a nested route", () => {
    expect(isNavigationItemActive("/dashboard/links", "/dashboard")).toBe(false);
  });

  it("returns true for exact non-dashboard route match", () => {
    expect(isNavigationItemActive("/dashboard/links", "/dashboard/links")).toBe(true);
  });

  it("returns true for nested child of a non-dashboard route", () => {
    expect(isNavigationItemActive("/dashboard/boards/board-123", "/dashboard/boards")).toBe(true);
  });

  it("returns false when paths share a prefix but are different routes", () => {
    expect(isNavigationItemActive("/dashboard/links", "/dashboard/boards")).toBe(false);
  });

  it("returns false for unrelated paths", () => {
    expect(isNavigationItemActive("/settings", "/dashboard/settings")).toBe(false);
  });
});
