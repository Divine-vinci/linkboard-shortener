import { describe, expect, it } from "vitest";

import { generateSlug, SLUG_ALPHABET, SLUG_LENGTH } from "@/lib/slug";

describe("src/lib/slug.ts", () => {
  it("generates a 7-character alphanumeric slug", () => {
    const slug = generateSlug();

    expect(slug).toHaveLength(SLUG_LENGTH);
    expect(slug).toMatch(new RegExp(`^[${SLUG_ALPHABET}]{${SLUG_LENGTH}}$`));
  });

  it("produces distinct values across a sample set", () => {
    const slugs = new Set(Array.from({ length: 100 }, () => generateSlug()));

    expect(slugs.size).toBe(100);
  });
});
