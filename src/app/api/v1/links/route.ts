import { NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth/config";
import { createLink, findLinkBySlug } from "@/lib/db/links";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { generateSlug } from "@/lib/slug";
import { fieldErrorsFromZod } from "@/lib/validations/helpers";
import { createLinkSchema } from "@/lib/validations/link";

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

    const slug = await generateUniqueSlug();
    const link = await createLink({
      slug,
      targetUrl: parsed.data.targetUrl,
      userId,
    });

    return NextResponse.json(
      successResponse({
        id: link.id,
        slug: link.slug,
        targetUrl: link.targetUrl,
        userId: link.userId,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
      }),
      { status: 201 },
    );
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

    logger.error("links.create.unexpected_error", {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    throw error;
  }
}
