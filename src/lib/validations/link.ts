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

const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_TAG_LENGTH = 24;
const MAX_TAG_COUNT = 8;
const MAX_LIBRARY_QUERY_LENGTH = 200;
const EXPIRATION_MIN_FUTURE_MS = 60_000;

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

function emptyStringToUndefined(value: unknown) {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}

const optionalCustomSlugSchema = z.preprocess(emptyStringToUndefined, customSlugSchema.optional());

export const optionalTitleSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().min(1).max(MAX_TITLE_LENGTH, `Title must be at most ${MAX_TITLE_LENGTH} characters`).optional(),
);

export const optionalDescriptionSchema = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .trim()
    .min(1)
    .max(MAX_DESCRIPTION_LENGTH, `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`)
    .optional(),
);

const isoDateTimeSchema = z
  .string()
  .datetime({ offset: true, message: "Enter a valid ISO 8601 datetime" })
  .transform((value) => new Date(value))
  .refine(
    (value) => value.getTime() > Date.now() + EXPIRATION_MIN_FUTURE_MS,
    "Expiration must be in the future",
  );

export const optionalExpiresAtSchema = z.preprocess(
  emptyStringToUndefined,
  isoDateTimeSchema.optional(),
);

function emptyStringToNull(value: unknown) {
  if (value === null) {
    return null;
  }

  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  return value;
}

const nullableExpiresAtSchema = z.preprocess(
  emptyStringToNull,
  z.union([isoDateTimeSchema, z.null()]).optional(),
);

const tagValueSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Tags cannot be empty")
  .max(MAX_TAG_LENGTH, `Each tag must be at most ${MAX_TAG_LENGTH} characters`);

function normalizeTags(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const rawTags =
    typeof value === "string"
      ? value.split(",")
      : Array.isArray(value)
        ? value.filter((tag): tag is string => typeof tag === "string")
        : undefined;

  if (!Array.isArray(rawTags)) {
    return undefined;
  }

  const normalized = Array.from(
    new Set(rawTags.map((tag) => tag.trim().toLowerCase()).filter(Boolean)),
  );

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeTagsForUpdate(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return [];
  }

  const rawTags =
    typeof value === "string"
      ? value.split(",")
      : Array.isArray(value)
        ? value.filter((tag): tag is string => typeof tag === "string")
        : undefined;

  if (!Array.isArray(rawTags)) {
    return undefined;
  }

  const normalized = Array.from(
    new Set(rawTags.map((tag) => tag.trim().toLowerCase()).filter(Boolean)),
  );

  return normalized;
}

export const optionalTagsSchema = z.preprocess(
  normalizeTags,
  z
    .array(tagValueSchema)
    .max(MAX_TAG_COUNT, `You can add up to ${MAX_TAG_COUNT} tags`)
    .optional(),
);

const optionalBoardIdSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().uuid("Select a valid board").optional(),
);

export const createLinkSchema = z.object({
  targetUrl: httpUrlSchema,
  customSlug: optionalCustomSlugSchema,
  title: optionalTitleSchema,
  description: optionalDescriptionSchema,
  tags: optionalTagsSchema,
  expiresAt: optionalExpiresAtSchema,
  boardId: optionalBoardIdSchema,
});

const nullableTitleSchema = z.preprocess(
  emptyStringToNull,
  z
    .string()
    .trim()
    .min(1)
    .max(MAX_TITLE_LENGTH, `Title must be at most ${MAX_TITLE_LENGTH} characters`)
    .nullable()
    .optional(),
);

const nullableDescriptionSchema = z.preprocess(
  emptyStringToNull,
  z
    .string()
    .trim()
    .min(1)
    .max(MAX_DESCRIPTION_LENGTH, `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`)
    .nullable()
    .optional(),
);

const nullableTagsSchema = z.preprocess(
  normalizeTagsForUpdate,
  z
    .array(tagValueSchema)
    .max(MAX_TAG_COUNT, `You can add up to ${MAX_TAG_COUNT} tags`)
    .optional(),
);

export const optionalHttpUrlSchema = httpUrlSchema.optional();

const updateLinkFieldsSchema = z.object({
  targetUrl: optionalHttpUrlSchema,
  title: nullableTitleSchema,
  description: nullableDescriptionSchema,
  tags: nullableTagsSchema,
  expiresAt: nullableExpiresAtSchema,
});

export const updateLinkMetadataSchema = updateLinkFieldsSchema
  .pick({
    title: true,
    description: true,
    tags: true,
  })
  .refine(
    (value) => value.title !== undefined || value.description !== undefined || value.tags !== undefined,
    {
      message: "At least one metadata field is required",
      path: [],
    },
  );

export const updateLinkSchema = updateLinkFieldsSchema.refine(
  (value) =>
    value.targetUrl !== undefined ||
    value.title !== undefined ||
    value.description !== undefined ||
    value.tags !== undefined ||
    value.expiresAt !== undefined,
  {
    message: "At least one link field is required",
    path: [],
  },
);

export const linkLibraryQuerySchema = z.object({
  q: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().min(1).max(MAX_LIBRARY_QUERY_LENGTH, `Search query must be at most ${MAX_LIBRARY_QUERY_LENGTH} characters`).optional(),
  ),
  tag: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().toLowerCase().min(1).max(MAX_TAG_LENGTH, `Tag must be at most ${MAX_TAG_LENGTH} characters`).optional(),
  ),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateLinkSchemaInput = z.input<typeof createLinkSchema>;
export type CreateLinkInput = z.output<typeof createLinkSchema>;
export type UpdateLinkMetadataSchemaInput = z.input<typeof updateLinkMetadataSchema>;
export type UpdateLinkMetadataInput = z.output<typeof updateLinkMetadataSchema>;
export type UpdateLinkSchemaInput = z.input<typeof updateLinkSchema>;
export type UpdateLinkInput = z.output<typeof updateLinkSchema>;
export type LinkLibraryQueryInput = z.output<typeof linkLibraryQuerySchema>;
