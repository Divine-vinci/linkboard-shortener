import { prisma } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import type { NextRequest } from "next/server";

const MAX_USER_AGENT_LENGTH = 512;
const MAX_REFERRER_LENGTH = 2048;
const MAX_COUNTRY_LENGTH = 10;

type GeoRequest = NextRequest & {
  geo?: {
    country?: string | null;
  };
};

function truncate(value: string | null, maxLength: number): string | null {
  if (value === null) return null;
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function getCountry(request: GeoRequest) {
  return request.headers.get("x-vercel-ip-country") ?? request.geo?.country ?? null;
}

export async function captureClickEvent(linkId: string, request: NextRequest): Promise<void> {
  try {
    const referrer = truncate(request.headers.get("referer"), MAX_REFERRER_LENGTH);
    const userAgent = truncate(request.headers.get("user-agent"), MAX_USER_AGENT_LENGTH) ?? "unknown";
    const country = truncate(getCountry(request as GeoRequest), MAX_COUNTRY_LENGTH);

    await prisma.clickEvent.create({
      data: {
        linkId,
        referrer,
        country,
        userAgent,
      },
    });
  } catch (error) {
    logger.error("analytics.capture_click_event_failed", {
      linkId,
      error,
    });
  }
}
