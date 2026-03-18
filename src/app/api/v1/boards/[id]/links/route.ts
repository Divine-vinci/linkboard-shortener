import { NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth/config";
import { addLinkToBoard } from "@/lib/db/board-links";
import { findBoardSummaryById } from "@/lib/db/boards";
import { findLinkById } from "@/lib/db/links";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { addBoardLinkSchema } from "@/lib/validations/board";
import { fieldErrorsFromZod } from "@/lib/validations/helpers";

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as Record<string, unknown>).code === "P2002"
  );
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
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
    const parsed = addBoardLinkSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(new AppError("VALIDATION_ERROR", "Invalid board link input", 400), {
          fields: fieldErrorsFromZod(parsed.error),
        }),
        { status: 400 },
      );
    }

    const board = await findBoardSummaryById(id);

    if (!board || board.userId !== userId) {
      return NextResponse.json(
        errorResponse(new AppError("NOT_FOUND", "Board not found", 404)),
        { status: 404 },
      );
    }

    const link = await findLinkById(parsed.data.linkId, userId);

    if (!link) {
      return NextResponse.json(
        errorResponse(new AppError("BAD_REQUEST", "Invalid link", 400)),
        { status: 400 },
      );
    }

    const boardLink = await addLinkToBoard({ boardId: id, linkId: parsed.data.linkId });

    return NextResponse.json(successResponse(boardLink), { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        errorResponse(new AppError("BAD_REQUEST", "Request body must be valid JSON", 400)),
        { status: 400 },
      );
    }

    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        errorResponse(new AppError("CONFLICT", "Link is already on this board", 409)),
        { status: 409 },
      );
    }

    logger.error("board-links.create.unexpected_error", {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    throw error;
  }
}
