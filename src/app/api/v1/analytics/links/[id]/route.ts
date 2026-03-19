import { NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { resolveUserId } from "@/lib/auth/api-key-middleware";
import {
  getLinkAnalyticsOverview,
  getLinkClicksTimeseries,
  getLinkGeoBreakdown,
  getLinkReferrerBreakdown,
} from "@/lib/db/analytics";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { analyticsQuerySchema } from "@/lib/validations/api-analytics";
import { fieldErrorsFromZod } from "@/lib/validations/helpers";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json(
      errorResponse(new AppError("UNAUTHORIZED", "Authentication required", 401)),
      { status: 401 },
    );
  }

  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const parsed = analyticsQuerySchema.safeParse({
      granularity: url.searchParams.get("granularity") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(new AppError("VALIDATION_ERROR", "Invalid query parameters", 400), {
          fields: fieldErrorsFromZod(parsed.error),
        }),
        { status: 400 },
      );
    }

    const { granularity } = parsed.data;
    const overview = await getLinkAnalyticsOverview(userId, id);

    if (!overview) {
      return NextResponse.json(
        errorResponse(new AppError("NOT_FOUND", "Link not found", 404)),
        { status: 404 },
      );
    }

    const [timeseriesData, referrers, geoBreakdown] = await Promise.all([
      getLinkClicksTimeseries(userId, id, granularity),
      getLinkReferrerBreakdown(userId, id),
      getLinkGeoBreakdown(userId, id),
    ]);

    return NextResponse.json(successResponse({
      overview,
      timeseries: {
        granularity,
        data: timeseriesData,
      },
      referrers,
      geoBreakdown,
    }));
  } catch (error) {
    if (error instanceof Error && error.name === "PrismaClientValidationError") {
      return NextResponse.json(
        errorResponse(new AppError("NOT_FOUND", "Link not found", 404)),
        { status: 404 },
      );
    }

    logger.error("analytics.links.get.unexpected_error", {
      error: error instanceof Error ? error.message : String(error),
      userId,
      linkId: id,
    });
    throw error;
  }
}
