import "server-only";
import type { PresenceStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { TxClient } from "@/lib/db/transaction";

/**
 * Durable presence data access. Redis stays the live, high-churn layer;
 * this table is the persistent record — written only on connect/disconnect
 * transitions, never on every heartbeat or cursor move.
 *
 * Recommended integration point: the socket server's connection lifecycle
 * (via a thin API beacon, since the socket tier holds no DB access) marks a
 * member ONLINE on connect and OFFLINE on disconnect.
 */

export function recordPresence(
  input: {
    workspaceId: string;
    userId: string;
    status: PresenceStatus;
    lastCursor?: { x: number; y: number } | null;
  },
  db: TxClient = prisma,
) {
  const data = {
    status: input.status,
    lastSeenAt: new Date(),
    lastCursor: input.lastCursor ?? undefined,
  };
  return db.presenceState.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: input.workspaceId,
        userId: input.userId,
      },
    },
    update: data,
    create: { workspaceId: input.workspaceId, userId: input.userId, ...data },
  });
}

/** Durable presence for a workspace, joined with member identity. */
export function getWorkspacePresence(
  workspaceId: string,
  db: TxClient = prisma,
) {
  return db.presenceState.findMany({
    where: { workspaceId },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
    orderBy: { lastSeenAt: "desc" },
  });
}

/** Just the online members — index-only filter on (workspaceId, status). */
export function getOnlineMembers(
  workspaceId: string,
  db: TxClient = prisma,
) {
  return db.presenceState.findMany({
    where: { workspaceId, status: "ONLINE" },
    select: { userId: true, lastSeenAt: true },
  });
}

/**
 * Failsafe: flag members ONLINE longer than the staleness window as
 * OFFLINE. Covers the case where a socket dropped without a clean
 * disconnect event. Safe to run from a periodic job.
 */
export function reapStalePresence(
  olderThan: Date,
  db: TxClient = prisma,
) {
  return db.presenceState.updateMany({
    where: { status: { not: "OFFLINE" }, lastSeenAt: { lt: olderThan } },
    data: { status: "OFFLINE" },
  });
}
