import { NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth/config";
import { getBoardLinksWithMetadata, reorderBoardLinks } from "@/lib/db/board-links";
import { findBoardSummaryById } from "@/lib/db/boards";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { reorderBoardLinksSchema } from "@/lib/validations/board";
import { fieldErrorsFromZod } from "@/lib/validations/helpers";

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
    const parsed = reorderBoardLinksSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(new AppError("VALIDATION_ERROR", "Invalid board link reorder input", 400), {
          fields: fieldErrorsFromZod(parsed.error),
        }),
        { status: 400 },
      );
    }

    const board = await findBoardSummaryById(id);

    if (!board || board.userId !== userId) {
      return NextResponse.json(errorResponse(new AppError("NOT_FOUND", "Board not found", 404)), { status: 404 });
    }

    const currentBoardLinks = await getBoardLinksWithMetadata(id);
    const currentLinkIds = currentBoardLinks.map((boardLink) => boardLink.linkId);
    const submittedLinkIds = parsed.data.linkIds;
    const currentLinkIdSet = new Set(currentLinkIds);
    const submittedLinkIdSet = new Set(submittedLinkIds);

    const hasMismatch =
      currentLinkIds.length !== submittedLinkIds.length ||
      submittedLinkIdSet.size !== submittedLinkIds.length ||
      submittedLinkIds.some((linkId) => !currentLinkIdSet.has(linkId));

    if (hasMismatch) {
      return NextResponse.json(
        errorResponse(new AppError("BAD_REQUEST", "Reorder payload must include each board link exactly once", 400)),
        { status: 400 },
      );
    }

    const reorderedBoardLinks = await reorderBoardLinks(id, submittedLinkIds);

    return NextResponse.json(successResponse(reorderedBoardLinks));
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        errorResponse(new AppError("BAD_REQUEST", "Request body must be valid JSON", 400)),
        { status: 400 },
      );
    }

    logger.error("board-links.reorder.unexpected_error", {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    throw error;
  }
}
