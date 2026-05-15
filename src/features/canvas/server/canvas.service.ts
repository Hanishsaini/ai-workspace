import "server-only";
import type { Prisma } from "@prisma/client";
import type { CanvasOp, CanvasOpApplied } from "@workspace/shared";
import { nextCanvasSeq } from "@/lib/redis/sequence";
import { publishToWorkspace } from "@/lib/realtime/publish";
import { Errors } from "@/lib/api/errors";
import {
  appendOperation,
  findCanvasById,
  listOperationsSince,
  updateSnapshot,
} from "./canvas.repository";

/**
 * Applies a client-proposed canvas op. The server is the ordering authority:
 * it assigns a monotonic `serverSeq`, appends to the op log, folds the op
 * into the materialized snapshot, and broadcasts `canvas:op:applied` to all
 * members — including the originator, which reconciles its optimistic update
 * by matching `opId`.
 *
 * Conflict policy (MVP): server-ordered last-write-wins per block. Good
 * enough for two users on notes; a CRDT swap is the future-scale path.
 */
export async function applyCanvasOp(
  canvasId: string,
  actorId: string,
  op: CanvasOp,
): Promise<CanvasOpApplied> {
  const canvas = await findCanvasById(canvasId);
  if (!canvas) throw Errors.notFound("Canvas");

  const serverSeq = await nextCanvasSeq(canvasId);

  await appendOperation({
    canvasDocumentId: canvasId,
    actorId,
    serverSeq,
    op: op as unknown as Prisma.InputJsonValue,
  });

  const nextSnapshot = foldOp(
    (canvas.snapshot as unknown as CanvasSnapshot) ?? { blocks: [] },
    op,
  );
  await updateSnapshot(
    canvasId,
    nextSnapshot as unknown as Prisma.InputJsonValue,
    serverSeq,
  );

  const applied: CanvasOpApplied = {
    ...op,
    canvasId,
    actorId,
    serverSeq,
    createdAt: new Date().toISOString(),
  };

  await publishToWorkspace(canvas.workspaceId, "canvas:op:applied", applied);
  return applied;
}

export function getOperationsSince(canvasId: string, sinceSeq: number) {
  return listOperationsSince(canvasId, sinceSeq);
}

// ─── Snapshot folding (MVP notes model) ─────────────────────────────────

interface CanvasBlock {
  id: string;
  text: string;
}
interface CanvasSnapshot {
  blocks: CanvasBlock[];
}

function foldOp(snapshot: CanvasSnapshot, op: CanvasOp): CanvasSnapshot {
  const blocks = [...(snapshot.blocks ?? [])];
  const payload = op.payload as Partial<CanvasBlock> & { id: string };

  switch (op.type) {
    case "insert":
      blocks.push({ id: payload.id, text: payload.text ?? "" });
      break;
    case "update": {
      const idx = blocks.findIndex((b) => b.id === payload.id);
      if (idx !== -1) blocks[idx] = { ...blocks[idx], text: payload.text ?? "" };
      break;
    }
    case "delete":
      return { blocks: blocks.filter((b) => b.id !== payload.id) };
  }
  return { blocks };
}
