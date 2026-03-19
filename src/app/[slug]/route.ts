import { NextResponse } from "next/server";

import { captureClickEvent } from "@/lib/analytics/capture";
import { getRedirectCache, setRedirectCache } from "@/lib/cache/redirect";
import { findLinkBySlug } from "@/lib/db/links";
import { logger } from "@/lib/logger";

const RESERVED_SLUGS = new Set([
  "api",
  "_next",
  "dashboard",
  "login",
  "register",
  "settings",
  "expired",
  "b",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

function isExpired(expiresAt: string | Date | null) {
  if (!expiresAt) {
    return false;
  }

  return new Date(expiresAt).getTime() < Date.now();
}

function redirectToExpiredPage(request: Request) {
  return NextResponse.redirect(new URL("/expired", request.url));
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  if (!slug || RESERVED_SLUGS.has(slug)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cached = await getRedirectCache(slug);

  if (cached) {
    if (isExpired(cached.expiresAt)) {
      logger.warn("redirect.expired", { slug });
      return redirectToExpiredPage(request);
    }

    logger.info("redirect.cache_hit", { slug });
    void captureClickEvent(cached.linkId, request as never);
    return NextResponse.redirect(cached.targetUrl, { status: 301 });
  }

  logger.info("redirect.cache_miss", { slug });
  const link = await findLinkBySlug(slug);

  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (isExpired(link.expiresAt)) {
    logger.warn("redirect.expired", { slug });
    return redirectToExpiredPage(request);
  }

  await setRedirectCache(slug, {
    targetUrl: link.targetUrl,
    linkId: link.id,
    expiresAt: link.expiresAt?.toISOString() ?? null,
  });

  void captureClickEvent(link.id, request as never);
  return NextResponse.redirect(link.targetUrl, { status: 301 });
}
