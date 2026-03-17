import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { createUser, findUserByEmail } from "@/lib/db/users";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { registerSchema } from "@/lib/validations/auth";
import { fieldErrorsFromZod } from "@/lib/validations/helpers";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = registerSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(
          new AppError("VALIDATION_ERROR", "Invalid registration input", 400),
          { fields: fieldErrorsFromZod(parsed.error) },
        ),
        { status: 400 },
      );
    }

    const existingUser = await findUserByEmail(parsed.data.email);

    if (existingUser) {
      return NextResponse.json(
        errorResponse(new AppError("CONFLICT", "Email is already registered", 409)),
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await createUser({
      email: parsed.data.email,
      passwordHash,
    });

    return NextResponse.json(
      successResponse({
        id: user.id,
        email: user.email,
      }),
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        errorResponse(new AppError("BAD_REQUEST", "Request body must be valid JSON", 400)),
        { status: 400 },
      );
    }

    logger.error("registration.unexpected_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
