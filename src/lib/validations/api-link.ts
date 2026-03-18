import { z } from "zod";

import {
  customSlugSchema,
  emptyStringToUndefined,
  httpUrlSchema,
  optionalDescriptionSchema,
  optionalExpiresAtSchema,
  optionalTagsSchema,
  optionalTitleSchema,
  updateLinkSchema,
} from "@/lib/validations/link";

export const apiCreateLinkSchema = z.object({
  targetUrl: httpUrlSchema,
  slug: z.preprocess(emptyStringToUndefined, customSlugSchema.optional()),
  title: optionalTitleSchema,
  description: optionalDescriptionSchema,
  tags: optionalTagsSchema,
  expiresAt: optionalExpiresAtSchema,
  boardId: z.preprocess(emptyStringToUndefined, z.string().uuid("Select a valid board").optional()),
});

export const apiListLinksQuerySchema = z.object({
  search: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().min(1).max(200, "Search query must be at most 200 characters").optional(),
  ),
  sortBy: z.enum(["createdAt", "updatedAt"]).default("createdAt"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const apiUpdateLinkSchema = updateLinkSchema;
