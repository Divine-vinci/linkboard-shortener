import { BoardVisibility } from "@prisma/client";
import { z } from "zod";

import { createApiKeySchema } from "@/lib/validations/api-key";
import { analyticsQuerySchema } from "@/lib/validations/api-analytics";
import { apiCreateLinkSchema, apiListLinksQuerySchema, apiUpdateLinkSchema } from "@/lib/validations/api-link";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "@/lib/validations/auth";
import {
  addBoardLinkSchema,
  boardListQuerySchema,
  createBoardSchema,
  reorderBoardLinksSchema,
  updateBoardSchema,
} from "@/lib/validations/board";
import { updateProfileSchema } from "@/lib/validations/profile";

const dateTimeStringSchema = z.iso.datetime({ offset: true });
const uuidSchema = z.uuid();

export const linkResponseSchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  targetUrl: z.string().url(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  tags: z.array(z.string()),
  expiresAt: dateTimeStringSchema.nullable(),
  userId: uuidSchema,
  createdAt: dateTimeStringSchema,
  updatedAt: dateTimeStringSchema,
});

export const boardCountSchema = z.object({
  boardLinks: z.int().nonnegative(),
});

export const boardResponseSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  visibility: z.nativeEnum(BoardVisibility),
  userId: uuidSchema,
  createdAt: dateTimeStringSchema,
  updatedAt: dateTimeStringSchema,
  _count: boardCountSchema.optional(),
});

export const paginationSchema = z.object({
  total: z.int().nonnegative(),
  limit: z.int().positive(),
  offset: z.int().nonnegative(),
});

export const boardLinkResponseSchema = z.object({
  id: uuidSchema,
  boardId: uuidSchema,
  linkId: uuidSchema,
  position: z.int().nonnegative(),
  addedAt: dateTimeStringSchema,
});

export const apiKeySchema = z.object({
  id: uuidSchema,
  name: z.string(),
  keyPrefix: z.string(),
  createdAt: dateTimeStringSchema,
  lastUsedAt: dateTimeStringSchema.nullable(),
});

export const createdApiKeySchema = apiKeySchema.omit({ lastUsedAt: true }).extend({
  rawKey: z.string().regex(/^lb_[a-f0-9]+$/i),
});

export const profileSchema = z.object({
  id: uuidSchema,
  name: z.string().nullable(),
  email: z.email(),
  image: z.string().url().nullable(),
  createdAt: dateTimeStringSchema,
});

export const authRegisterResponseSchema = z.object({
  id: uuidSchema,
  email: z.email(),
});

export const authLoginResponseSchema = z.object({
  email: z.email(),
  ok: z.literal(true),
});

export const messageResponseSchema = z.object({
  message: z.string(),
});

export const linkAnalyticsOverviewSchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  targetUrl: z.string().url(),
  totalClicks: z.int().nonnegative(),
});

export const boardTopLinkSchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  title: z.string().nullable(),
  clicks: z.int().nonnegative(),
});

export const boardAnalyticsOverviewSchema = z.object({
  boardName: z.string(),
  totalClicks: z.int().nonnegative(),
  linkCount: z.int().nonnegative(),
  topLinks: z.array(boardTopLinkSchema),
});

export const timeseriesPointSchema = z.object({
  label: z.string(),
  periodStart: dateTimeStringSchema,
  clicks: z.int().nonnegative(),
});

export const referrerBreakdownItemSchema = z.object({
  domain: z.string(),
  clicks: z.int().nonnegative(),
});

export const geoBreakdownItemSchema = z.object({
  country: z.string(),
  clicks: z.int().nonnegative(),
});

export const linkAnalyticsResponseSchema = z.object({
  overview: linkAnalyticsOverviewSchema,
  timeseries: z.object({
    granularity: analyticsQuerySchema.shape.granularity,
    data: z.array(timeseriesPointSchema),
  }),
  referrers: z.array(referrerBreakdownItemSchema),
  geoBreakdown: z.array(geoBreakdownItemSchema),
});

export const boardAnalyticsResponseSchema = z.object({
  overview: boardAnalyticsOverviewSchema,
  timeseries: z.object({
    granularity: analyticsQuerySchema.shape.granularity,
    data: z.array(timeseriesPointSchema),
  }),
  referrers: z.array(referrerBreakdownItemSchema),
  geoBreakdown: z.array(geoBreakdownItemSchema),
});

export const validationDetailsSchema = z.object({
  fields: z.record(z.string(), z.string()).optional(),
  retryAfter: z.int().positive().optional(),
}).catchall(z.unknown());

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: validationDetailsSchema.optional(),
  }),
});

export const schemas = {
  apiCreateLinkSchema,
  apiListLinksQuerySchema,
  apiUpdateLinkSchema,
  createBoardSchema,
  updateBoardSchema,
  boardListQuerySchema,
  addBoardLinkSchema,
  reorderBoardLinksSchema,
  analyticsQuerySchema,
  createApiKeySchema,
  updateProfileSchema,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  linkResponseSchema,
  boardResponseSchema,
  paginationSchema,
  boardLinkResponseSchema,
  apiKeySchema,
  createdApiKeySchema,
  profileSchema,
  authRegisterResponseSchema,
  authLoginResponseSchema,
  messageResponseSchema,
  linkAnalyticsResponseSchema,
  boardAnalyticsResponseSchema,
  errorResponseSchema,
} as const;

export type SchemaName = keyof typeof schemas;
