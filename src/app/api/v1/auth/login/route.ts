import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { findUserByEmail } from "@/lib/db/users";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  extractClientIp,
  getRateLimitStatus,
  recordRateLimitFailure,
  resetRateLimit,
} from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validations/auth";
import { fieldErrorsFromZod } from "@/lib/validations/helpers";

const MAX_FAILED_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";

function unauthorizedResponse() {
  return NextResponse.json(
    errorResponse(new AppError("UNAUTHORIZED", INVALID_CREDENTIALS_MESSAGE, 401)),
    { status: 401 },
  );
}

function rateLimitedResponse(retryAfter: number) {
  return NextResponse.json(
    errorResponse(new AppError("RATE_LIMITED", "Too many failed login attempts", 429), {
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

export async function POST(request: Request) {
  const ip = extractClientIp(request.headers);
  const rateLimitKey = `auth:login:${ip}`;

  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(new AppError("VALIDATION_ERROR", "Invalid login input", 400), {
          fields: fieldErrorsFromZod(parsed.error),
        }),
        { status: 400 },
      );
    }

    const rateLimitStatus = getRateLimitStatus(rateLimitKey, MAX_FAILED_ATTEMPTS, WINDOW_MS);

    if (rateLimitStatus.limited) {
      return rateLimitedResponse(rateLimitStatus.retryAfter);
    }

    const user = await findUserByEmail(parsed.data.email);
    const passwordMatches = user?.passwordHash
      ? await bcrypt.compare(parsed.data.password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      recordRateLimitFailure(rateLimitKey, MAX_FAILED_ATTEMPTS, WINDOW_MS);
      return unauthorizedResponse();
    }

    resetRateLimit(rateLimitKey);

    return NextResponse.json(
      successResponse({
        email: parsed.data.email,
        ok: true,
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

    logger.error("login.unexpected_error", {
      error: error instanceof Error ? error.message : String(error),
      ip,
    });
    throw error;
  }
}
