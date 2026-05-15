import { canvasOpSchema } from "@workspace/shared";
import { callNextApi } from "../../lib/next-api.js";
import { parseEvent } from "../validate.js";
import type { AppServer, AppSocket } from "../types.js";

/**
 * Canvas ops. Forwarded to /api/canvas/[id]/ops, which assigns the
 * authoritative `serverSeq`, persists to the op log, and publishes
 * `canvas:op:applied` back through Redis to every member (including the
 * originator, which reconciles its optimistic update by `opId`).
 *
 * Conflict resolution: the server is the ordering authority. Optimistic
 * client edits are applied locally on emit, then reconciled when the
 * `serverSeq`-stamped echo arrives — last-writer-wins per block, ordered.
 */
export function registerCanvasHandlers(
  _io: AppServer,
  socket: AppSocket,
): void {
  const { userId } = socket.data;

  socket.on("canvas:op", (payload) => {
    const data = parseEvent(canvasOpSchema, payload, socket, "canvas:op");
    if (!data) return;

    void (async () => {
      const res = await callNextApi(
        `/api/canvas/${data.canvasId}/ops`,
        { op: data.op },
        userId,
      );
      if (!res.ok) {
        socket.emit("system:error", {
          message: "Failed to apply your canvas change.",
        });
      }
    })();
  });
}
