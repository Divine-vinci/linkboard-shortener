import { NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { generateApiKey } from "@/lib/auth/api-key";
import { resolveSessionApiIdentity } from "@/lib/auth/api-key-middleware";
import { createApiKey, findApiKeysByUserId } from "@/lib/db/api-keys";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { enforceApiRateLimit } from "@/lib/rate-limit";
import { createApiKeySchema } from "@/lib/validations/api-key";
import { fieldErrorsFromZod } from "@/lib/validations/helpers";

export async function GET() {
  const identity = await resolveSessionApiIdentity();

  if (!identity) {
    return NextResponse.json(
      errorResponse(new AppError("UNAUTHORIZED", "Authentication required", 401)),
      { status: 401 },
    );
  }

  const rateLimitedResponse = await enforceApiRateLimit(identity.rateLimitKey);

  if (rateLimitedResponse) {
    return rateLimitedResponse;
  }

  const userId = identity.userId;

  try {
    const apiKeys = await findApiKeysByUserId(userId);
    return NextResponse.json(successResponse(apiKeys));
  } catch (error) {
    logger.error("api_keys.list.unexpected_error", {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    throw error;
  }
}

export async function POST(request: Request) {
  const identity = await resolveSessionApiIdentity();

  if (!identity) {
    return NextResponse.json(
      errorResponse(new AppError("UNAUTHORIZED", "Authentication required", 401)),
      { status: 401 },
    );
  }

  const rateLimitedResponse = await enforceApiRateLimit(identity.rateLimitKey);

  if (rateLimitedResponse) {
    return rateLimitedResponse;
  }

  const userId = identity.userId;

  try {
    const json = await request.json();
    const parsed = createApiKeySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(new AppError("VALIDATION_ERROR", "Invalid API key input", 400), {
          fields: fieldErrorsFromZod(parsed.error),
        }),
        { status: 400 },
      );
    }

    const generated = generateApiKey();
    const apiKey = await createApiKey({
      userId,
      name: parsed.data.name,
      keyHash: generated.keyHash,
      keyPrefix: generated.keyPrefix,
    });

    logger.info("api_keys.create.success", {
      userId,
      apiKeyId: apiKey.id,
      keyPrefix: apiKey.keyPrefix,
    });

    return NextResponse.json(
      successResponse({
        ...apiKey,
        rawKey: generated.rawKey,
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

    if (error instanceof AppError) {
      return NextResponse.json(errorResponse(error), { status: error.statusCode });
    }

    logger.error("api_keys.create.unexpected_error", {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    throw error;
  }
}
