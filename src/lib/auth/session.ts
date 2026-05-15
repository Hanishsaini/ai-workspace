import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "@/lib/db/prisma";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

/** Resolve the current user, or null if unauthenticated. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
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
