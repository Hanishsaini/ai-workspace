import { NextResponse, type NextRequest } from "next/server";

/**
 * No-op middleware.
 *
 * The previous `withAuth` edge middleware was bouncing valid sessions back
 * to /login on Vercel — likely an edge-runtime / cookie / NEXTAUTH_SECRET
 * propagation issue that was eating into the demo timeline. Auth is now
 * enforced at the route level instead: every protected page (the dashboard,
 * the workspace surface) calls `getCurrentUser()` and redirects to /login
 * itself when the session is absent.
 *
 * End-user behavior is identical; the difference is the check runs in the
 * Node.js function rather than the edge.
 */
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

// Run on nothing — let pages handle their own auth.
export const config = {
  matcher: [],
};
