import { NextResponse } from "next/server";

import { env } from "@/config/env";
import { errorResponse, successResponse } from "@/lib/api-response";
import { createPasswordResetToken } from "@/lib/auth/password-reset";
import { findUserByEmail } from "@/lib/db/users";
import { AppError } from "@/lib/errors";
import { sendEmail } from "@/lib/email/send";
import { logger } from "@/lib/logger";
import {
  extractClientIp,
  getRateLimitStatus,
  recordRateLimitFailure,
} from "@/lib/rate-limit";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { fieldErrorsFromZod } from "@/lib/validations/helpers";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const SUCCESS_MESSAGE =
  "If an account exists for that email, we've sent a password reset link.";

function rateLimitedResponse(retryAfter: number) {
  return NextResponse.json(
    errorResponse(new AppError("RATE_LIMITED", "Too many password reset requests", 429), {
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
      },
    },
  );
}

async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${encodeURIComponent(token)}`;

  await sendEmail({
    to: email,
    subject: "Reset your Linkboard password",
    html: `
      <p>You requested a password reset for your Linkboard account.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
    `,
  });
}

export async function POST(request: Request) {
  const ip = extractClientIp(request.headers);
  const rateLimitKey = `auth:forgot-password:${ip}`;

  try {
    const rateLimitStatus = getRateLimitStatus(rateLimitKey, MAX_ATTEMPTS, WINDOW_MS);

    if (rateLimitStatus.limited) {
      return rateLimitedResponse(rateLimitStatus.retryAfter);
    }

    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(new AppError("VALIDATION_ERROR", "Invalid forgot password input", 400), {
          fields: fieldErrorsFromZod(parsed.error),
        }),
        { status: 400 },
      );
    }

    const user = await findUserByEmail(parsed.data.email);

    if (user) {
      const { token } = await createPasswordResetToken(user.email);

      void sendPasswordResetEmail(user.email, token).catch((error) => {
        logger.error("forgot_password.email_failed", {
          email: user.email,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }

    recordRateLimitFailure(rateLimitKey, MAX_ATTEMPTS, WINDOW_MS);

    return NextResponse.json(
      successResponse({
        message: SUCCESS_MESSAGE,
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

    logger.error("forgot_password.unexpected_error", {
      error: error instanceof Error ? error.message : String(error),
      ip,
    });
    throw error;
  }
}

export { SUCCESS_MESSAGE as FORGOT_PASSWORD_SUCCESS_MESSAGE };
