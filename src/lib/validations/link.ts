import { z } from "zod";

export const RESERVED_SLUGS = [
  "api",
  "admin",
  "login",
  "register",
  "dashboard",
  "settings",
  "b",
  "reset-password",
  "api-docs",
  "health",
  "_next",
  "favicon.ico",
] as const;

const httpUrlSchema = z
  .string({ error: "Target URL is required" })
  .trim()
  .min(1, "Target URL is required")
  .url("Enter a valid URL")
  .refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }, "URL must start with http:// or https://");

export const customSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Custom slug must be at least 3 characters")
  .max(50, "Custom slug must be at most 50 characters")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must contain only lowercase letters, numbers, and hyphens (no leading, trailing, or consecutive hyphens)",
  )
  .refine(
    (value) => !RESERVED_SLUGS.includes(value as (typeof RESERVED_SLUGS)[number]),
    "This slug is reserved and cannot be used",
  );

const optionalCustomSlugSchema = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }

    return value;
  },
  customSlugSchema.optional(),
);

export const createLinkSchema = z.object({
  targetUrl: httpUrlSchema,
  customSlug: optionalCustomSlugSchema,
});

export type CreateLinkSchemaInput = z.input<typeof createLinkSchema>;
export type CreateLinkInput = z.output<typeof createLinkSchema>;
