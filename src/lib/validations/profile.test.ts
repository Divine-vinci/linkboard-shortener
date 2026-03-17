import { describe, expect, it } from "vitest";

import { updateProfileSchema } from "@/lib/validations/profile";

describe("src/lib/validations/profile.ts", () => {
  it("accepts a valid trimmed name", () => {
    expect(updateProfileSchema.parse({ name: "  Vinci  " })).toEqual({ name: "Vinci" });
  });

  it("allows an omitted name", () => {
    expect(updateProfileSchema.parse({})).toEqual({});
  });

  it("rejects an empty trimmed name", () => {
    const parsed = updateProfileSchema.safeParse({ name: "   " });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.name).toContain("Name is required");
    }
  });

  it("rejects a name longer than 100 characters", () => {
    const parsed = updateProfileSchema.safeParse({ name: "a".repeat(101) });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.name).toContain(
        "Name must be 100 characters or fewer",
      );
    }
  });
});
