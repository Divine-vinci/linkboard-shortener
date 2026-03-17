import { describe, expect, it } from "vitest";

import { createLinkSchema, customSlugSchema, RESERVED_SLUGS } from "@/lib/validations/link";

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

  describe("customSlugSchema", () => {
    it("accepts valid slugs", () => {
      expect(customSlugSchema.parse("my-slug")).toBe("my-slug");
      expect(customSlugSchema.parse("q2-webinar")).toBe("q2-webinar");
      expect(customSlugSchema.parse("abc")).toBe("abc");
      expect(customSlugSchema.parse("a1b2c3")).toBe("a1b2c3");
    });

    it("normalizes to lowercase", () => {
      expect(customSlugSchema.parse("My-Slug")).toBe("my-slug");
      expect(customSlugSchema.parse("ABC")).toBe("abc");
    });

    it("trims whitespace", () => {
      expect(customSlugSchema.parse(" my-slug ")).toBe("my-slug");
    });

    it("rejects slugs shorter than 3 characters", () => {
      const parsed = customSlugSchema.safeParse("ab");

      expect(parsed.success).toBe(false);
    });

    it("rejects slugs longer than 50 characters", () => {
      const parsed = customSlugSchema.safeParse("a".repeat(51));

      expect(parsed.success).toBe(false);
    });

    it("accepts slugs at length boundaries", () => {
      expect(customSlugSchema.parse("abc")).toBe("abc");
      expect(customSlugSchema.parse("a".repeat(50))).toBe("a".repeat(50));
    });

    it("rejects slugs with leading hyphens", () => {
      const parsed = customSlugSchema.safeParse("-my-slug");

      expect(parsed.success).toBe(false);
    });

    it("rejects slugs with trailing hyphens", () => {
      const parsed = customSlugSchema.safeParse("my-slug-");

      expect(parsed.success).toBe(false);
    });

    it("rejects slugs with consecutive hyphens", () => {
      const parsed = customSlugSchema.safeParse("my--slug");

      expect(parsed.success).toBe(false);
    });

    it("rejects slugs with special characters", () => {
      expect(customSlugSchema.safeParse("my_slug").success).toBe(false);
      expect(customSlugSchema.safeParse("my.slug").success).toBe(false);
      expect(customSlugSchema.safeParse("my slug").success).toBe(false);
      expect(customSlugSchema.safeParse("my@slug").success).toBe(false);
    });

    it("rejects reserved slugs", () => {
      for (const reserved of RESERVED_SLUGS) {
        const parsed = customSlugSchema.safeParse(reserved);

        // Some reserved slugs may fail format validation (e.g., "b" is too short, "favicon.ico" has a dot)
        // but those that pass format should fail the reserved word check
        expect(parsed.success).toBe(false);
      }
    });

    it("rejects reserved slugs that pass format validation", () => {
      const parsed = customSlugSchema.safeParse("api");

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const errors = parsed.error.flatten().formErrors;

        expect(errors).toContain("This slug is reserved and cannot be used");
      }
    });
  });

  describe("createLinkSchema with customSlug", () => {
    it("accepts a request with valid customSlug", () => {
      const result = createLinkSchema.parse({
        targetUrl: "https://example.com",
        customSlug: "my-link",
      });

      expect(result).toEqual({
        targetUrl: "https://example.com",
        customSlug: "my-link",
      });
    });

    it("accepts a request without customSlug", () => {
      const result = createLinkSchema.parse({
        targetUrl: "https://example.com",
      });

      expect(result).toEqual({
        targetUrl: "https://example.com",
      });
    });

    it("treats an empty customSlug as omitted", () => {
      const result = createLinkSchema.parse({
        targetUrl: "https://example.com",
        customSlug: "",
      });

      expect(result).toEqual({
        targetUrl: "https://example.com",
      });
    });

    it("treats a whitespace-only customSlug as omitted", () => {
      const result = createLinkSchema.parse({
        targetUrl: "https://example.com",
        customSlug: "   ",
      });

      expect(result).toEqual({
        targetUrl: "https://example.com",
      });
    });

    it("rejects invalid customSlug with field error", () => {
      const parsed = createLinkSchema.safeParse({
        targetUrl: "https://example.com",
        customSlug: "a",
      });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.flatten().fieldErrors.customSlug).toBeDefined();
      }
    });
  });
});
