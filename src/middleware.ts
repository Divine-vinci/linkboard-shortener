import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { env } from "@/config/env";
import { captureClickEvent } from "@/lib/analytics/capture";
import { getRedirectCache, setRedirectCache } from "@/lib/cache/redirect";
import { findLinkBySlug } from "@/lib/db/links";
import { logger } from "@/lib/logger";

const DASHBOARD_ENTRY_ROUTE = "/dashboard";
const PROTECTED_ROUTE_PREFIXES = ["/dashboard"];
const AUTH_ONLY_ROUTES = new Set(["/login"]);
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

function getSlugFromPathname(pathname: string) {
  if (pathname === "/") {
    return null;
  }

  const segments = pathname.split("/").filter(Boolean);

  if (segments.length !== 1) {
    return null;
  }

  const [slug] = segments;
  return RESERVED_SLUGS.has(slug) ? null : slug;
}

function redirectToExpiredPage(request: NextRequest) {
  return NextResponse.redirect(new URL("/expired", request.url));
}

function scheduleClickCapture(
  event: NextFetchEvent | undefined,
  linkId: string,
  request: NextRequest,
) {
  const capturePromise = captureClickEvent(linkId, request);

  if (event) {
    event.waitUntil(capturePromise);
    return;
  }

  void capturePromise;
}

async function resolveShortLinkRedirect(request: NextRequest, event?: NextFetchEvent) {
  const slug = getSlugFromPathname(request.nextUrl.pathname);

  if (!slug) {
    return null;
  }

  const cached = await getRedirectCache(slug);

  if (cached) {
    if (isExpired(cached.expiresAt)) {
      logger.warn("redirect.expired", { slug });
      return redirectToExpiredPage(request);
    }

    logger.info("redirect.cache_hit", { slug });
    scheduleClickCapture(event, cached.linkId, request);
    return NextResponse.redirect(cached.targetUrl, { status: 301 });
  }

  logger.info("redirect.cache_miss", { slug });
  const link = await findLinkBySlug(slug);

  if (!link) {
    return null;
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

  scheduleClickCapture(event, link.id, request);
  return NextResponse.redirect(link.targetUrl, { status: 301 });
}

export function resolveAuthRedirect(pathname: string, isAuthenticated: boolean) {
  const isProtectedRoute = PROTECTED_ROUTE_PREFIXES.some(
    (routePrefix) => pathname === routePrefix || pathname.startsWith(`${routePrefix}/`),
  );

  if (!isAuthenticated && isProtectedRoute) {
    return "/login";
  }

  if (isAuthenticated && AUTH_ONLY_ROUTES.has(pathname)) {
    return DASHBOARD_ENTRY_ROUTE;
  }

  return null;
}

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const redirectResponse = await resolveShortLinkRedirect(request, event);

  if (redirectResponse) {
    return redirectResponse;
  }

  const token = await getToken({
    req: request,
    secret: env.AUTH_SECRET,
  });

  const destination = resolveAuthRedirect(request.nextUrl.pathname, Boolean(token));

  if (!destination) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(destination, request.url));
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/:slug"],
};
