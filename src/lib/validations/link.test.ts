import { describe, expect, it } from "vitest";

import { createLinkSchema } from "@/lib/validations/link";

describe("src/lib/validations/link.ts", () => {
  it("accepts a valid http url", () => {
    expect(
      createLinkSchema.parse({
        targetUrl: " https://example.com/path ",
      }),
    ).toEqual({ targetUrl: "https://example.com/path" });
  });

  it("rejects malformed urls", () => {
    const parsed = createLinkSchema.safeParse({ targetUrl: "not-a-url" });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.targetUrl).toContain("Enter a valid URL");
    }
  });

  it("rejects non-http protocols", () => {
    const parsed = createLinkSchema.safeParse({ targetUrl: "ftp://example.com" });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.targetUrl).toContain(
        "URL must start with http:// or https://",
      );
    }
  });
});
