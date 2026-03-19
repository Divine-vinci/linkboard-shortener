import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { env } from "@/config/env";

const DASHBOARD_ENTRY_ROUTE = "/dashboard";
const PROTECTED_ROUTE_PREFIXES = ["/dashboard"];
const AUTH_ONLY_ROUTES = new Set(["/login"]);

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

export async function middleware(request: NextRequest) {
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
  matcher: ["/dashboard/:path*", "/login"],
};
