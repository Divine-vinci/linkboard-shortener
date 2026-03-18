import { describe, expect, it } from "vitest";

import {
  createLinkSchema,
  customSlugSchema,
  linkLibraryQuerySchema,
  optionalExpiresAtSchema,
  RESERVED_SLUGS,
  updateLinkMetadataSchema,
  updateLinkSchema,
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

    it("accepts a valid boardId", () => {
      const result = createLinkSchema.parse({
        targetUrl: "https://example.com",
        boardId: "11111111-1111-4111-8111-111111111111",
      });

      expect(result).toEqual({
        targetUrl: "https://example.com",
        boardId: "11111111-1111-4111-8111-111111111111",
      });
    });

    it("rejects a non-uuid boardId", () => {
      const parsed = createLinkSchema.safeParse({
        targetUrl: "https://example.com",
        boardId: "not-a-uuid",
      });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.flatten().fieldErrors.boardId).toContain("Select a valid board");
      }
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

  describe("updateLinkSchema", () => {
    it("accepts future expiration updates", () => {
      const expiresAt = "2099-03-22T12:00:00.000Z";

      expect(updateLinkSchema.parse({ expiresAt })).toEqual({
        expiresAt: new Date(expiresAt),
      });
    });

    it("accepts null to clear expiration", () => {
      expect(updateLinkSchema.parse({ expiresAt: null })).toEqual({ expiresAt: null });
    });

    it("accepts targetUrl-only updates", () => {
      expect(updateLinkSchema.parse({ targetUrl: " https://example.com/updated " })).toEqual({
        targetUrl: "https://example.com/updated",
      });
    });

    it("accepts targetUrl with other fields in one update", () => {
      expect(
        updateLinkSchema.parse({
          targetUrl: "https://example.com/updated",
          title: " Updated title ",
        }),
      ).toEqual({
        targetUrl: "https://example.com/updated",
        title: "Updated title",
      });
    });

    it("rejects malformed targetUrl updates", () => {
      const parsed = updateLinkSchema.safeParse({ targetUrl: "not-a-url" });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.flatten().fieldErrors.targetUrl).toContain("Enter a valid URL");
      }
    });

    it("rejects non-http targetUrl updates", () => {
      const parsed = updateLinkSchema.safeParse({ targetUrl: "ftp://example.com" });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.flatten().fieldErrors.targetUrl).toContain(
          "URL must start with http:// or https://",
        );
      }
    });

    it("rejects empty-string targetUrl updates", () => {
      const parsed = updateLinkSchema.safeParse({ targetUrl: "" });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.flatten().fieldErrors.targetUrl).toContain("Target URL is required");
      }
    });

    it("rejects null targetUrl updates", () => {
      const parsed = updateLinkSchema.safeParse({ targetUrl: null });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.flatten().fieldErrors.targetUrl).toContain("Target URL is required");
      }
    });

    it("rejects past expiration updates", () => {
      const parsed = updateLinkSchema.safeParse({ expiresAt: "2020-03-20T15:30:00.000Z" });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.flatten().fieldErrors.expiresAt).toContain("Expiration must be in the future");
      }
    });

    it("accepts undefined targetUrl when another field is present", () => {
      expect(updateLinkSchema.parse({ targetUrl: undefined, title: "Updated" })).toEqual({
        title: "Updated",
      });
    });

    it("rejects an empty patch body", () => {
      const parsed = updateLinkSchema.safeParse({});

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.flatten().formErrors).toContain("At least one link field is required");
      }
    });
  });
});

describe("linkLibraryQuerySchema", () => {
  it("applies defaults and trims optional values", () => {
    expect(linkLibraryQuerySchema.parse({ q: "  docs ", tag: " Launch " })).toEqual({
      q: "docs",
      tag: "launch",
      page: 1,
      limit: 20,
    });
  });

  it("rejects invalid pagination bounds", () => {
    const parsed = linkLibraryQuerySchema.safeParse({ page: "0", limit: "101" });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.page).toContain("Too small: expected number to be >=1");
      expect(parsed.error.flatten().fieldErrors.limit).toContain("Too big: expected number to be <=100");
    }
  });
});
