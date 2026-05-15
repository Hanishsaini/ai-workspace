"use client";

import { useCallback } from "react";
import { nanoid } from "nanoid";
import type { CanvasOp } from "@workspace/shared";
import { useSocket } from "@/components/providers/socket-provider";
import { useWorkspaceStore } from "@/stores/workspace-store";

/**
 * Canvas surface with optimistic editing: an op is applied to the local
 * snapshot immediately and tracked in `pendingOps`, then emitted. When the
 * server echoes `canvas:op:applied` with the authoritative `serverSeq`, the
 * store reconciles by matching `opId` and drops it from `pendingOps`.
 */
export function useCanvas() {
  const { socket } = useSocket();
  const canvas = useWorkspaceStore((s) => s.canvas);
  const addPendingOp = useWorkspaceStore((s) => s.addPendingOp);
  const applyCanvasOp = useWorkspaceStore((s) => s.applyCanvasOp);

  const emitOp = useCallback(
    (type: CanvasOp["type"], payload: unknown) => {
      if (!socket || !canvas) return;
      const op: CanvasOp = { opId: nanoid(), type, payload };

      // Optimistic: reflect locally now, reconcile on the server echo.
      addPendingOp(op);
      applyCanvasOp({
        ...op,
        canvasId: canvas.id,
        actorId: "self",
        serverSeq: useWorkspaceStore.getState().lastServerSeq,
        createdAt: new Date().toISOString(),
      });

      socket.emit("canvas:op", { canvasId: canvas.id, op });
    },
    [socket, canvas, addPendingOp, applyCanvasOp],
  );

  const blocks =
    (canvas?.snapshot.blocks as Array<{ id: string; text: string }>) ?? [];

  return {
    canvas,
    blocks,
    insertBlock: (text: string) =>
      emitOp("insert", { id: nanoid(), text }),
    updateBlock: (id: string, text: string) =>
      emitOp("update", { id, text }),
    deleteBlock: (id: string) => emitOp("delete", { id }),
  };
}
