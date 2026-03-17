import type { Link } from "@prisma/client";

import { AppError } from "@/lib/errors";

export function toLinkResponse(
  link: Pick<Link, "id" | "slug" | "targetUrl" | "title" | "description" | "tags" | "expiresAt" | "userId" | "createdAt" | "updatedAt">,
) {
  return {
    id: link.id,
    slug: link.slug,
    targetUrl: link.targetUrl,
    title: link.title,
    description: link.description,
    tags: link.tags,
    expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
    userId: link.userId,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  };
}

export type SuccessResponse<T> = { data: T };
export type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

export function successResponse<T>(data: T): SuccessResponse<T> {
  return { data };
}

export function errorResponse(
  error: AppError,
  details?: Record<string, unknown>,
): ErrorResponse {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(details ? { details } : {}),
    },
  };
}
