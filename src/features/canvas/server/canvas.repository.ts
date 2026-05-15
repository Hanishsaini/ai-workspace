import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/** Data access for the shared canvas/notes document + its op log. */

export function findCanvasById(canvasId: string) {
  return prisma.canvasDocument.findUnique({ where: { id: canvasId } });
}

export function appendOperation(input: {
  canvasDocumentId: string;
  actorId: string;
  serverSeq: number;
  op: Prisma.InputJsonValue;
}) {
  return prisma.canvasOperation.create({ data: input });
}

export function listOperationsSince(canvasId: string, sinceSeq: number) {
  return prisma.canvasOperation.findMany({
    where: { canvasDocumentId: canvasId, serverSeq: { gt: sinceSeq } },
    orderBy: { serverSeq: "asc" },
  });
}

/**
 * Bumps the document version and merges the materialized snapshot. The
 * snapshot is a periodic compaction of the op log so clients don't replay
 * thousands of ops on load — here we update it on every op for simplicity;
 * at scale this would move to a debounced/batched compaction job.
 */
export function updateSnapshot(
  canvasId: string,
  snapshot: Prisma.InputJsonValue,
  version: number,
) {
  return prisma.canvasDocument.update({
    where: { id: canvasId },
    data: { snapshot, version },
  });
}
