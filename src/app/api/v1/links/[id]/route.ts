import { NextResponse } from "next/server";

import { errorResponse, successResponse, toLinkResponse } from "@/lib/api-response";
import { resolveApiRequestIdentity } from "@/lib/auth/api-key-middleware";
import { deleteLink, findLinkById, updateLink } from "@/lib/db/links";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { enforceApiRateLimit } from "@/lib/rate-limit";
import { apiUpdateLinkSchema } from "@/lib/validations/api-link";
import { fieldErrorsFromZod } from "@/lib/validations/helpers";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await resolveApiRequestIdentity(request);

  if (!identity) {
    return NextResponse.json(
      errorResponse(new AppError("UNAUTHORIZED", "Authentication required", 401)),
      { status: 401 },
    );
  }

  const rateLimitedResponse = await enforceApiRateLimit(identity.rateLimitKey);

  if (rateLimitedResponse) {
    return rateLimitedResponse;
  }

  const userId = identity.userId;

  try {
    const { id } = await context.params;
    const link = await findLinkById(id, userId);

    if (!link) {
      return NextResponse.json(
        errorResponse(new AppError("NOT_FOUND", "Link not found", 404)),
        { status: 404 },
      );
    }

    return NextResponse.json(successResponse(toLinkResponse(link)));
  } catch (error) {
    if (error instanceof Error && error.name === "PrismaClientValidationError") {
      return NextResponse.json(
        errorResponse(new AppError("NOT_FOUND", "Link not found", 404)),
        { status: 404 },
      );
    }

    logger.error("links.get.unexpected_error", {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    throw error;
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await resolveApiRequestIdentity(request);

  if (!identity) {
    return NextResponse.json(
      errorResponse(new AppError("UNAUTHORIZED", "Authentication required", 401)),
      { status: 401 },
    );
  }

  const rateLimitedResponse = await enforceApiRateLimit(identity.rateLimitKey);

  if (rateLimitedResponse) {
    return rateLimitedResponse;
  }

  const userId = identity.userId;

  try {
    const { id } = await context.params;
    const json = await request.json();
    const parsed = apiUpdateLinkSchema.safeParse(json);

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

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await resolveApiRequestIdentity(request);

  if (!identity) {
    return NextResponse.json(
      errorResponse(new AppError("UNAUTHORIZED", "Authentication required", 401)),
      { status: 401 },
    );
  }

  const rateLimitedResponse = await enforceApiRateLimit(identity.rateLimitKey);

  if (rateLimitedResponse) {
    return rateLimitedResponse;
  }

  const userId = identity.userId;

  try {
    const { id } = await context.params;
    const deleted = await deleteLink(id, userId);

    if (!deleted) {
      return NextResponse.json(
        errorResponse(new AppError("NOT_FOUND", "Link not found", 404)),
        { status: 404 },
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.name === "PrismaClientValidationError") {
      return NextResponse.json(
        errorResponse(new AppError("NOT_FOUND", "Link not found", 404)),
        { status: 404 },
      );
    }

    logger.error("links.delete.unexpected_error", {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    throw error;
  }
}
