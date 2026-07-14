import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Defense-in-depth edge gate for the authenticated dashboard segment. (In Next 16
// the `middleware` file convention was renamed to `proxy`.)
//
// This is an OPTIMISTIC check — cookie presence only, no DB call, so it stays
// edge-safe and fast. The AUTHORITATIVE validation remains requireSession() inside
// each page, which verifies the session against the database. Running this gate
// before any route renders means a page added under the dashboard in future is not
// reachable anonymously even if someone forgets its per-page guard — including via
// RSC prefetch requests, which is exactly how the earlier data leak was reachable.
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

// Only the authenticated dashboard pages. Deliberately does NOT match /login,
// /api/*, /mcp, /.well-known/*, or static assets — those handle their own auth
// (or are intentionally public) and must not be redirected.
export const config = {
  matcher: ["/", "/notes/:path*", "/analytics/:path*"],
};
