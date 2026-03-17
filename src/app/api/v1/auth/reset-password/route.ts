import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { errorResponse, successResponse } from "@/lib/api-response";
import {
  consumePasswordResetToken,
  validatePasswordResetToken,
} from "@/lib/auth/password-reset";
import { deleteSessionsByUserId, findUserByEmail, updateUser } from "@/lib/db/users";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { resetPasswordSchema } from "@/lib/validations/auth";

function fieldErrorsFromZod(error: ZodError) {
  const flattened = error.flatten().fieldErrors as Record<string, string[] | undefined>;

  return Object.fromEntries(
    Object.entries(flattened).map(([field, messages]) => [field, messages?.[0] ?? "Invalid value"]),
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(new AppError("VALIDATION_ERROR", "Invalid reset password input", 400), {
          fields: fieldErrorsFromZod(parsed.error),
        }),
        { status: 400 },
      );
    }

    const email = await validatePasswordResetToken(parsed.data.token);

    if (!email) {
      return NextResponse.json(
        errorResponse(
          new AppError(
            "INVALID_TOKEN",
            "That password reset link is invalid or has expired. Request a new reset email.",
            400,
          ),
        ),
        { status: 400 },
      );
    }

    const user = await findUserByEmail(email);

    if (!user) {
      await consumePasswordResetToken(parsed.data.token);

      return NextResponse.json(
        errorResponse(
          new AppError(
            "INVALID_TOKEN",
            "That password reset link is invalid or has expired. Request a new reset email.",
            400,
          ),
        ),
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    await updateUser(user.id, { passwordHash });
    await deleteSessionsByUserId(user.id);
    await consumePasswordResetToken(parsed.data.token);

    return NextResponse.json(
      successResponse({
        message: "Your password has been reset successfully.",
      }),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        errorResponse(new AppError("BAD_REQUEST", "Request body must be valid JSON", 400)),
        { status: 400 },
      );
    }

    logger.error("reset_password.unexpected_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
