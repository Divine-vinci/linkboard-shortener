import { NextResponse } from "next/server";

import { errorResponse, successResponse, toBoardResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth/config";
import { countBoardsByUserId, createBoard, findBoardsByUserId } from "@/lib/db/boards";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { createBoardSchema, boardListQuerySchema } from "@/lib/validations/board";
import { fieldErrorsFromZod } from "@/lib/validations/helpers";

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
  const parsed = boardListQuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
    offset: url.searchParams.get("offset") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      errorResponse(new AppError("VALIDATION_ERROR", "Invalid board query", 400), {
        fields: fieldErrorsFromZod(parsed.error),
      }),
      { status: 400 },
    );
  }

  try {
    const { limit, offset } = parsed.data;
    const [boards, total] = await Promise.all([
      findBoardsByUserId(userId, { limit, offset }),
      countBoardsByUserId(userId),
    ]);

    return NextResponse.json({
      data: boards.map((board) => toBoardResponse(board)),
      pagination: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error("boards.list.unexpected_error", {
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
    const parsed = createBoardSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(new AppError("VALIDATION_ERROR", "Invalid board input", 400), {
          fields: fieldErrorsFromZod(parsed.error),
        }),
        { status: 400 },
      );
    }

    const board = await createBoard({
      ...parsed.data,
      userId,
    });

    return NextResponse.json(successResponse(toBoardResponse(board)), { status: 201 });
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

    logger.error("boards.create.unexpected_error", {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    throw error;
  }
}
