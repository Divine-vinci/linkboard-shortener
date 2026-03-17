import { describe, expect, it } from "vitest";

import {
  createLinkSchema,
  customSlugSchema,
  optionalExpiresAtSchema,
  RESERVED_SLUGS,
  updateLinkExpirationSchema,
  updateLinkMetadataSchema,
} from "@/lib/validations/link";

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

  describe("createLinkSchema with metadata", () => {
    it("accepts a request with valid customSlug and metadata", () => {
      const expiresAt = "2099-03-20T15:30:00.000Z";
      const result = createLinkSchema.parse({
        targetUrl: "https://example.com",
        customSlug: "my-link",
        title: "  Product launch  ",
        description: "  Keep this handy for rollout day.  ",
        tags: [" Docs ", "launch", "docs", ""],
        expiresAt,
      });

      expect(result).toEqual({
        targetUrl: "https://example.com",
        customSlug: "my-link",
        title: "Product launch",
        description: "Keep this handy for rollout day.",
        tags: ["docs", "launch"],
        expiresAt: new Date(expiresAt),
      });
    });

    it("accepts a request without customSlug or metadata", () => {
      const result = createLinkSchema.parse({
        targetUrl: "https://example.com",
      });

      expect(result).toEqual({
        targetUrl: "https://example.com",
      });
    });

    it("treats empty optional metadata fields as omitted", () => {
      const result = createLinkSchema.parse({
        targetUrl: "https://example.com",
        customSlug: "",
        title: "   ",
        description: "  ",
        tags: [],
        expiresAt: "   ",
      });

      expect(result).toEqual({
        targetUrl: "https://example.com",
      });
    });

    it("rejects too many tags", () => {
      const parsed = createLinkSchema.safeParse({
        targetUrl: "https://example.com",
        tags: ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine"],
      });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.flatten().fieldErrors.tags).toContain("You can add up to 8 tags");
      }
    });

    it("rejects tags longer than the max length", () => {
      const parsed = createLinkSchema.safeParse({
        targetUrl: "https://example.com",
        tags: ["x".repeat(25)],
      });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.flatten().fieldErrors.tags).toContain(
          "Each tag must be at most 24 characters",
        );
      }
    });
  });

  describe("optionalExpiresAtSchema", () => {
    it("accepts a valid future ISO datetime", () => {
      const expiresAt = "2099-03-20T15:30:00.000Z";

      expect(optionalExpiresAtSchema.parse(expiresAt)).toEqual(new Date(expiresAt));
    });

    it("rejects past datetimes", () => {
      const parsed = optionalExpiresAtSchema.safeParse("2020-03-20T15:30:00.000Z");

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.flatten().formErrors).toContain("Expiration must be in the future");
      }
    });

    it("accepts undefined to skip expiration", () => {
      expect(optionalExpiresAtSchema.parse(undefined)).toBeUndefined();
    });

    it("rejects invalid datetime formats", () => {
      const parsed = optionalExpiresAtSchema.safeParse("2026-03-20T15:30");

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.flatten().formErrors).toContain("Enter a valid ISO 8601 datetime");
      }
    });
  });

  describe("updateLinkMetadataSchema", () => {
    it("accepts partial metadata updates", () => {
      expect(updateLinkMetadataSchema.parse({ title: "  Updated title  " })).toEqual({
        title: "Updated title",
      });
    });

    it("normalizes tags during metadata updates", () => {
      expect(updateLinkMetadataSchema.parse({ tags: [" Work ", "work", "Docs"] })).toEqual({
        tags: ["work", "docs"],
      });
    });

    it("rejects an empty patch body", () => {
      const parsed = updateLinkMetadataSchema.safeParse({});

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.flatten().formErrors).toContain("At least one metadata field is required");
      }
    });

    it("accepts null to clear title and description", () => {
      expect(updateLinkMetadataSchema.parse({ title: null })).toEqual({ title: null });
      expect(updateLinkMetadataSchema.parse({ description: null })).toEqual({ description: null });
    });

    it("converts empty strings to null for clearing in updates", () => {
      expect(updateLinkMetadataSchema.parse({ title: "" })).toEqual({ title: null });
      expect(updateLinkMetadataSchema.parse({ title: "   " })).toEqual({ title: null });
    });

    it("accepts empty array to clear all tags", () => {
      expect(updateLinkMetadataSchema.parse({ tags: [] })).toEqual({ tags: [] });
    });
  });

  describe("updateLinkExpirationSchema", () => {
    it("accepts future expiration updates", () => {
      const expiresAt = "2099-03-22T12:00:00.000Z";

      expect(updateLinkExpirationSchema.parse({ expiresAt })).toEqual({
        expiresAt: new Date(expiresAt),
      });
    });

    it("accepts null to clear expiration", () => {
      expect(updateLinkExpirationSchema.parse({ expiresAt: null })).toEqual({ expiresAt: null });
    });

    it("rejects past expiration updates", () => {
      const parsed = updateLinkExpirationSchema.safeParse({ expiresAt: "2020-03-20T15:30:00.000Z" });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.flatten().fieldErrors.expiresAt).toContain("Expiration must be in the future");
      }
    });

    it("rejects an empty patch body", () => {
      const parsed = updateLinkExpirationSchema.safeParse({});

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.flatten().formErrors).toContain("At least one link field is required");
      }
    });
  });
});
