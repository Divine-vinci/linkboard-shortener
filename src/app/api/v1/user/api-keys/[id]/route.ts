import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth/config";
import { deleteApiKey } from "@/lib/db/api-keys";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

async function requireSessionUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await requireSessionUserId();

  if (!userId) {
    return NextResponse.json(
      errorResponse(new AppError("UNAUTHORIZED", "Authentication required", 401)),
      { status: 401 },
    );
  }

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
