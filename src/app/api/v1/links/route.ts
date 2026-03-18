import { NextResponse } from "next/server";

import { errorResponse, successResponse, toLinkResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth/config";
import { createLink, findLinkBySlug, findLinksForLibrary } from "@/lib/db/links";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { generateSlug } from "@/lib/slug";
import { fieldErrorsFromZod } from "@/lib/validations/helpers";
import { createLinkSchema, linkLibraryQuerySchema } from "@/lib/validations/link";

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

function isSlugUniqueConstraintError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as Record<string, unknown>).code === "P2002"
  );
}

async function createLinkWithGeneratedSlug(data: {
  targetUrl: string;
  title?: string;
  description?: string;
  tags?: string[];
  expiresAt?: Date;
  userId: string;
}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slug = await generateUniqueSlug();

    try {
      return await createLink({
        slug,
        targetUrl: data.targetUrl,
        title: data.title,
        description: data.description,
        tags: data.tags,
        expiresAt: data.expiresAt,
        userId: data.userId,
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
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      errorResponse(new AppError("UNAUTHORIZED", "Authentication required", 401)),
      { status: 401 },
    );
  }

  const url = new URL(request.url);
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
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      errorResponse(new AppError("UNAUTHORIZED", "Authentication required", 401)),
      { status: 401 },
    );
  }

  try {
    const json = await request.json();
    const parsed = createLinkSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(new AppError("VALIDATION_ERROR", "Invalid link input", 400), {
          fields: fieldErrorsFromZod(parsed.error),
        }),
        { status: 400 },
      );
    }

    let link;

    if (parsed.data.customSlug) {
      const existingLink = await findLinkBySlug(parsed.data.customSlug);

      if (existingLink) {
        return NextResponse.json(
          errorResponse(new AppError("CONFLICT", "Custom slug already exists", 409)),
          { status: 409 },
        );
      }

      link = await createLink({
        slug: parsed.data.customSlug,
        targetUrl: parsed.data.targetUrl,
        title: parsed.data.title,
        description: parsed.data.description,
        tags: parsed.data.tags,
        expiresAt: parsed.data.expiresAt,
        userId,
      });
    } else {
      link = await createLinkWithGeneratedSlug({
        targetUrl: parsed.data.targetUrl,
        title: parsed.data.title,
        description: parsed.data.description,
        tags: parsed.data.tags,
        expiresAt: parsed.data.expiresAt,
        userId,
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
