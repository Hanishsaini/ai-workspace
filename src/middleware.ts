import { withAuth } from "next-auth/middleware";

/**
 * Protected-route gate. Runs on the edge before any matched route renders.
 * Unauthenticated requests to /dashboard or /w/* are redirected to /login.
 *
 * Public routes (/, /login, /api/auth/*) intentionally bypass the matcher —
 * the home page and login both do their own auth handling. The realtime
 * token API is callable only when authenticated, but it does its own
 * session check inside the handler, so no middleware gate is needed there.
 *
 * NextAuth v4's `withAuth` reads the JWT from the session cookie; the
 * redirect target is configured by `pages.signIn` in authOptions.
 */
export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: ["/dashboard/:path*", "/w/:path*"],
};
