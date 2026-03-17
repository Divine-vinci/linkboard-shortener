import { NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth/config";
import { findUserById, updateUser } from "@/lib/db/users";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { fieldErrorsFromZod } from "@/lib/validations/helpers";
import { updateProfileSchema } from "@/lib/validations/profile";

type SafeProfile = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: Date;
};

function toProfileResponse(user: SafeProfile) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    createdAt: user.createdAt,
  };
}

async function requireSessionUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await requireSessionUserId();

  if (!userId) {
    return NextResponse.json(
      errorResponse(new AppError("UNAUTHORIZED", "Authentication required", 401)),
      { status: 401 },
    );
  }

  const user = await findUserById(userId);

  if (!user) {
    logger.warn("profile.get.user_not_found", { userId });
    return NextResponse.json(
      errorResponse(new AppError("NOT_FOUND", "User not found", 404)),
      { status: 404 },
    );
  }

  return NextResponse.json(successResponse(toProfileResponse(user)));
}

export async function PATCH(request: Request) {
  const userId = await requireSessionUserId();

  if (!userId) {
    return NextResponse.json(
      errorResponse(new AppError("UNAUTHORIZED", "Authentication required", 401)),
      { status: 401 },
    );
  }

  try {
    const json = await request.json();
    const parsed = updateProfileSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(new AppError("VALIDATION_ERROR", "Invalid profile input", 400), {
          fields: fieldErrorsFromZod(parsed.error),
        }),
        { status: 400 },
      );
    }

    const update: { name?: string | null } = {};

    if (parsed.data.name !== undefined) {
      update.name = parsed.data.name;
    }

    const user = await updateUser(userId, update);

    return NextResponse.json(successResponse(toProfileResponse(user)));
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        errorResponse(new AppError("BAD_REQUEST", "Request body must be valid JSON", 400)),
        { status: 400 },
      );
    }

    logger.error("profile.patch.unexpected_error", {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    throw error;
  }
}
