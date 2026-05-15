import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { TxClient } from "@/lib/db/transaction";

/**
 * Data access for users. Repositories own Prisma queries and accept an
 * optional `TxClient` so callers can compose them into a transaction;
 * services own orchestration + business rules.
 */

export function findUserById(id: string, db: TxClient = prisma) {
  return db.user.findUnique({ where: { id } });
}

export function findUserByEmail(email: string, db: TxClient = prisma) {
  return db.user.findUnique({ where: { email } });
}

/** Idempotent — used by the OAuth/dev sign-in path. The argument keeps the
 *  semantic `avatarUrl` name; we map it to the `image` DB column here so the
 *  rest of the app continues to think in DTO terms. */
export function upsertUser(
  input: { email: string; name?: string | null; avatarUrl?: string | null },
  db: TxClient = prisma,
) {
  return db.user.upsert({
    where: { email: input.email },
    update: { name: input.name, image: input.avatarUrl },
    create: { email: input.email, name: input.name, image: input.avatarUrl },
  });
}

/**
 * Users in the same workspaces as `userId` — the realistic "people you can
 * collaborate with" query. Single round-trip via a relation filter.
 */
export function findCollaborators(userId: string, db: TxClient = prisma) {
  return db.user.findMany({
    where: {
      id: { not: userId },
      memberships: {
        some: { workspace: { members: { some: { userId } } } },
      },
    },
    select: { id: true, name: true, image: true },
    orderBy: { name: "asc" },
  });
}

export function updateUser(
  id: string,
  data: Prisma.UserUpdateInput,
  db: TxClient = prisma,
) {
  return db.user.update({ where: { id }, data });
}
