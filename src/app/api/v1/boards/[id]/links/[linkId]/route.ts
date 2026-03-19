import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api-response";
import { resolveUserId } from "@/lib/auth/api-key-middleware";
import { recompactBoardLinkPositions, removeLinkFromBoard } from "@/lib/db/board-links";
import { findBoardSummaryById } from "@/lib/db/boards";
import { prisma } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function DELETE(request: Request, context: { params: Promise<{ id: string; linkId: string }> }) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json(
      errorResponse(new AppError("UNAUTHORIZED", "Authentication required", 401)),
      { status: 401 },
    );
  }

  try {
    const { id, linkId } = await context.params;
    const board = await findBoardSummaryById(id);

    if (!board || board.userId !== userId) {
      return NextResponse.json(
        errorResponse(new AppError("NOT_FOUND", "Board not found", 404)),
        { status: 404 },
      );
    }

    const boardLink = await prisma.boardLink.findUnique({
      where: {
        boardId_linkId: {
          boardId: id,
          linkId,
        },
      },
    });

    if (!boardLink) {
      return NextResponse.json(
        errorResponse(new AppError("NOT_FOUND", "Link not found on board", 404)),
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await removeLinkFromBoard(id, linkId, tx);
      await recompactBoardLinkPositions(id, tx);
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error("board-links.delete.unexpected_error", {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    throw error;
  }
}
