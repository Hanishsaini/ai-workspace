import { cookies } from "next/headers";
import { decode } from "next-auth/jwt";
import { prisma } from "@/lib/db/prisma";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

/**
 * Resolve the current user, or null if unauthenticated.
 *
 * Reads the NextAuth session JWT cookie directly via `next-auth/jwt`'s
 * `decode` rather than going through `getServerSession`. In Next.js 15
 * App Router, `getServerSession(authOptions)` is reliable inside `/api/*`
 * route handlers but silently returns null in RSC server components,
 * even when the cookie is valid — confirmed for this project after the
 * 2026-05-16 prod deploy where /api/auth/session returned a full session
 * but the dashboard page got null from getServerSession.
 *
 * Decoding the cookie ourselves bypasses the RSC bridge entirely.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  // NextAuth prefixes the cookie with `__Secure-` over HTTPS (production).
  const cookieName =
    process.env.NODE_ENV === "production"
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";
  const tokenStr = cookieStore.get(cookieName)?.value;
  if (!tokenStr) return null;

  const secret =
    process.env.NEXTAUTH_SECRET || "dev-only-insecure-secret-change-me";

  const decoded = await decode({ token: tokenStr, secret });
  const id = (decoded as { uid?: string } | null)?.uid;
  if (!id) return null;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    // DB column is `image` (NextAuth convention); the SessionUser contract
    // keeps the semantic `avatarUrl` name used everywhere downstream
    // (realtime token, presence, account menu).
    avatarUrl: user.image,
  };
}

/** Resolve the current user or throw — for code paths that require auth. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}
