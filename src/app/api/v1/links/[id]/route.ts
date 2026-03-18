import { NextResponse } from "next/server";

import { errorResponse, successResponse, toLinkResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth/config";
import { updateLink } from "@/lib/db/links";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { fieldErrorsFromZod } from "@/lib/validations/helpers";
import { updateLinkSchema } from "@/lib/validations/link";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      errorResponse(new AppError("UNAUTHORIZED", "Authentication required", 401)),
      { status: 401 },
    );
  }

  try {
    const { id } = await context.params;
    const json = await request.json();
    const parsed = updateLinkSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(new AppError("VALIDATION_ERROR", "Invalid link update input", 400), {
          fields: fieldErrorsFromZod(parsed.error),
        }),
        { status: 400 },
      );
    }

    const updatedLink = await updateLink(id, userId, parsed.data);

    if (!updatedLink) {
      return NextResponse.json(
        errorResponse(new AppError("NOT_FOUND", "Link not found", 404)),
        { status: 404 },
      );
    }

    return NextResponse.json(successResponse(toLinkResponse(updatedLink)));
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        errorResponse(new AppError("BAD_REQUEST", "Request body must be valid JSON", 400)),
        { status: 400 },
      );
    }

    logger.error("links.update.unexpected_error", {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    throw error;
  }
}
