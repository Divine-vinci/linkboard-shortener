import { NextResponse } from "next/server";

import { errorResponse, successResponse, toLinkResponse } from "@/lib/api-response";
import { resolveUserId } from "@/lib/auth/api-key-middleware";
import { addLinkToBoard } from "@/lib/db/board-links";
import { findBoardById } from "@/lib/db/boards";
import { prisma } from "@/lib/db/client";
import { createLink, findLinkBySlug, findLinksForLibrary, findLinksWithOffset } from "@/lib/db/links";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { generateSlug } from "@/lib/slug";
import { fieldErrorsFromZod } from "@/lib/validations/helpers";
import { apiCreateLinkSchema, apiListLinksQuerySchema } from "@/lib/validations/api-link";
import { createLinkSchema, linkLibraryQuerySchema } from "@/lib/validations/link";

function isSlugUniqueConstraintError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as Record<string, unknown>).code === "P2002"
  );
}

async function generateUniqueSlug() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slug = generateSlug();
    const existingLink = await findLinkBySlug(slug);

    if (!existingLink) {
      return slug;
    }
  }

  throw new AppError("CONFLICT", "Unable to generate a unique short link", 409);
}

async function createLinkRecord(data: {
  targetUrl: string;
  title?: string;
  description?: string;
  tags?: string[];
  expiresAt?: Date;
  userId: string;
  slug: string;
  boardId?: string;
}) {
  const linkData = {
    slug: data.slug,
    targetUrl: data.targetUrl,
    title: data.title,
    description: data.description,
    tags: data.tags,
    expiresAt: data.expiresAt,
    userId: data.userId,
  };

  if (!data.boardId) {
    return createLink(linkData);
  }

  return prisma.$transaction(async (tx) => {
    const board = await findBoardById(data.boardId!, tx);

    if (!board || board.userId !== data.userId) {
      throw new AppError("BAD_REQUEST", "Invalid board", 400);
    }

    const link = await tx.link.create({ data: linkData });

    await addLinkToBoard({ boardId: data.boardId!, linkId: link.id }, tx);

    return link;
  });
}

async function createLinkWithGeneratedSlug(data: {
  targetUrl: string;
  title?: string;
  description?: string;
  tags?: string[];
  expiresAt?: Date;
  userId: string;
  boardId?: string;
}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slug = await generateUniqueSlug();

    try {
      return await createLinkRecord({
        ...data,
        slug,
      });
    } catch (error) {
      if (isSlugUniqueConstraintError(error) && attempt < 2) {
        continue;
      }

      throw error;
    }
  }

  throw new AppError("CONFLICT", "Unable to generate a unique short link", 409);
}

export async function GET(request: Request) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json(
      errorResponse(new AppError("UNAUTHORIZED", "Authentication required", 401)),
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const hasOffsetPagination = url.searchParams.has("offset");

  if (hasOffsetPagination) {
    const parsed = apiListLinksQuerySchema.safeParse({
      search: url.searchParams.get("search") ?? undefined,
      sortBy: url.searchParams.get("sortBy") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      offset: url.searchParams.get("offset") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(new AppError("VALIDATION_ERROR", "Invalid link library query", 400), {
          fields: fieldErrorsFromZod(parsed.error),
        }),
        { status: 400 },
      );
    }

    const { search, sortBy, limit, offset } = parsed.data;

    try {
      const { links, total } = await findLinksWithOffset({
        userId,
        query: search,
        sortBy,
        limit,
        offset,
      });

      return NextResponse.json({
        data: links.map((link) => toLinkResponse(link)),
        pagination: {
          total,
          limit,
          offset,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        return NextResponse.json(errorResponse(error), { status: error.statusCode });
      }

      logger.error("links.list.unexpected_error", {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }

  const parsed = linkLibraryQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    tag: url.searchParams.get("tag") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      errorResponse(new AppError("VALIDATION_ERROR", "Invalid link library query", 400), {
        fields: fieldErrorsFromZod(parsed.error),
      }),
      { status: 400 },
    );
  }

  const { q, tag, page, limit } = parsed.data;

  try {
    const { links, total } = await findLinksForLibrary({
      userId,
      query: q,
      tag,
      page,
      limit,
    });
    const offset = (page - 1) * limit;

    return NextResponse.json({
      data: links.map((link) => toLinkResponse(link)),
      pagination: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(errorResponse(error), { status: error.statusCode });
    }

    logger.error("links.list.unexpected_error", {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    throw error;
  }
}

export async function POST(request: Request) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json(
      errorResponse(new AppError("UNAUTHORIZED", "Authentication required", 401)),
      { status: 401 },
    );
  }

  try {
    const json = await request.json();
    const hasCustomSlug = json && typeof json === "object" && !Array.isArray(json) && "customSlug" in json;
    const schema = hasCustomSlug ? createLinkSchema : apiCreateLinkSchema;
    const parsed = schema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(new AppError("VALIDATION_ERROR", "Invalid link input", 400), {
          fields: fieldErrorsFromZod(parsed.error),
        }),
        { status: 400 },
      );
    }

    const customSlug = "slug" in parsed.data ? parsed.data.slug : parsed.data.customSlug;

    let link;

    if (customSlug) {
      const existingLink = await findLinkBySlug(customSlug);

      if (existingLink) {
        return NextResponse.json(
          errorResponse(new AppError("CONFLICT", "Custom slug already exists", 409)),
          { status: 409 },
        );
      }

      link = await createLinkRecord({
        slug: customSlug,
        targetUrl: parsed.data.targetUrl,
        title: parsed.data.title,
        description: parsed.data.description,
        tags: parsed.data.tags,
        expiresAt: parsed.data.expiresAt,
        userId,
        boardId: parsed.data.boardId,
      });
    } else {
      link = await createLinkWithGeneratedSlug({
        targetUrl: parsed.data.targetUrl,
        title: parsed.data.title,
        description: parsed.data.description,
        tags: parsed.data.tags,
        expiresAt: parsed.data.expiresAt,
        userId,
        boardId: parsed.data.boardId,
      });
    }

    return NextResponse.json(successResponse(toLinkResponse(link)), { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        errorResponse(new AppError("BAD_REQUEST", "Request body must be valid JSON", 400)),
        { status: 400 },
      );
    }

    if (error instanceof AppError) {
      return NextResponse.json(errorResponse(error), { status: error.statusCode });
    }

    if (isSlugUniqueConstraintError(error)) {
      return NextResponse.json(
        errorResponse(new AppError("CONFLICT", "Custom slug already exists", 409)),
        { status: 409 },
      );
    }

    logger.error("links.create.unexpected_error", {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    throw error;
  }
}
