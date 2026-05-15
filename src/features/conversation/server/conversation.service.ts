import "server-only";
import type { CanvasOpApplied, SyncDelta } from "@workspace/shared";
import { prisma } from "@/lib/db/prisma";
import { getPresence } from "@/lib/redis/presence";
import { toMessageDTO } from "@/lib/db/mappers";
import { Errors } from "@/lib/api/errors";
import { listMessagesSince } from "./message.repository";
import { getOperationsSince } from "@/features/canvas/server/canvas.service";

/**
 * Catch-up / resync. The realtime transport is best-effort — correctness
 * comes from here. A client that detects a `serverSeq` gap (or reconnects)
 * calls this with its last-seen seq and gets every missed message + canvas
 * op, plus a fresh presence snapshot.
 */
export async function getSyncDelta(
  workspaceId: string,
  sinceSeq: number,
): Promise<SyncDelta> {
  const conversation = await prisma.conversation.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const canvas = await prisma.canvasDocument.findFirst({
    where: { workspaceId },
    orderBy: { updatedAt: "asc" },
    select: { id: true },
  });
  if (!conversation || !canvas) throw Errors.notFound("Workspace");

  const [messages, canvasOps, presence] = await Promise.all([
    listMessagesSince(conversation.id, sinceSeq),
    getOperationsSince(canvas.id, sinceSeq),
    getPresence(workspaceId),
  ]);

  const messageDTOs = messages.map(toMessageDTO);
  const opDTOs: CanvasOpApplied[] = canvasOps.map((row) => {
    const op = row.op as { opId: string; type: CanvasOpApplied["type"]; payload: unknown };
    return {
      opId: op.opId,
      type: op.type,
      payload: op.payload,
      canvasId: row.canvasDocumentId,
      actorId: row.actorId,
      serverSeq: row.serverSeq,
      createdAt: row.createdAt.toISOString(),
    };
  });

  const serverSeq = Math.max(
    sinceSeq,
    messageDTOs.at(-1)?.serverSeq ?? sinceSeq,
    opDTOs.at(-1)?.serverSeq ?? sinceSeq,
  );

  return {
    messages: messageDTOs,
    canvasOps: opDTOs,
    presence,
    serverSeq,
  };
}
