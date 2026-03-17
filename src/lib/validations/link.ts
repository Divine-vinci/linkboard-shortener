import { z } from "zod";

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

export const createLinkSchema = z.object({
  targetUrl: httpUrlSchema,
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;
