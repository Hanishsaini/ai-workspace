import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { TxClient } from "@/lib/db/transaction";

/**
 * Data access for NextAuth database sessions. The PrismaAdapter manages the
 * Session table directly under the "database" strategy; these helpers exist
 * for the operations the adapter does not expose — auditing active sessions
 * and forced revocation (e.g. "sign out everywhere").
 */

export function findActiveSessionsForUser(
  userId: string,
  db: TxClient = prisma,
) {
  return db.session.findMany({
    where: { userId, expires: { gt: new Date() } },
    orderBy: { expires: "desc" },
  });
}

/** Revoke one session by its opaque token. */
export function revokeSession(sessionToken: string, db: TxClient = prisma) {
  return db.session.deleteMany({ where: { sessionToken } });
}

/** Revoke every session for a user — "sign out of all devices". */
export function revokeAllSessions(userId: string, db: TxClient = prisma) {
  return db.session.deleteMany({ where: { userId } });
}

/** Housekeeping: drop expired rows. Safe to run from a cron. */
export function purgeExpiredSessions(db: TxClient = prisma) {
  return db.session.deleteMany({ where: { expires: { lt: new Date() } } });
}
