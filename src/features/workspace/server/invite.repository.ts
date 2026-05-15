import "server-only";
import type { MemberRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { TxClient } from "@/lib/db/transaction";

/**
 * Data access for workspace invites. Token lookups include the parent
 * workspace because the acceptance flow always needs both — saves a round
 * trip on the hot path.
 */

export function findInviteByToken(token: string, db: TxClient = prisma) {
  return db.workspaceInvite.findUnique({
    where: { token },
    include: { workspace: { select: { id: true, name: true } } },
  });
}

export function createInviteRecord(
  input: {
    token: string;
    workspaceId: string;
    invitedById: string;
    role: MemberRole;
    expiresAt: Date;
  },
  db: TxClient = prisma,
) {
  return db.workspaceInvite.create({ data: input });
}

export function markInviteUsed(
  id: string,
  usedById: string,
  db: TxClient = prisma,
) {
  return db.workspaceInvite.update({
    where: { id },
    data: { usedAt: new Date(), usedById },
  });
}
