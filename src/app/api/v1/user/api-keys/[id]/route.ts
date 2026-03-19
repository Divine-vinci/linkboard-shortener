import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api-response";
import { resolveSessionApiIdentity } from "@/lib/auth/api-key-middleware";
import { deleteApiKey } from "@/lib/db/api-keys";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { enforceApiRateLimit } from "@/lib/rate-limit";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await resolveSessionApiIdentity();

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
    const deleted = await deleteApiKey(id, userId);

    if (!deleted) {
      return NextResponse.json(
        errorResponse(new AppError("NOT_FOUND", "API key not found", 404)),
        { status: 404 },
      );
    }

    logger.info("api_keys.delete.success", {
      userId,
      apiKeyId: id,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.name === "PrismaClientValidationError") {
      return NextResponse.json(
        errorResponse(new AppError("NOT_FOUND", "API key not found", 404)),
        { status: 404 },
      );
    }

    logger.error("api_keys.delete.unexpected_error", {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    throw error;
  }
}
