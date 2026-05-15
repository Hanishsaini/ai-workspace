import { workspaceRoom } from "@workspace/shared";
import { registerPresenceHandlers } from "./handlers/presence.handler.js";
import { registerChatHandlers } from "./handlers/chat.handler.js";
import { registerCanvasHandlers } from "./handlers/canvas.handler.js";
import type { AppServer, AppSocket } from "./types.js";

/**
 * Per-connection lifecycle. Auth middleware has already populated
 * socket.data; here we join the workspace room and wire the feature
 * handlers. One room per workspace is the entire fan-out model.
 */
export function registerConnection(io: AppServer, socket: AppSocket): void {
  const { workspaceId, userId } = socket.data;
  socket.join(workspaceRoom(workspaceId));
  console.log(`[socket] ${userId} connected to workspace ${workspaceId}`);

  registerPresenceHandlers(io, socket);
  registerChatHandlers(io, socket);
  registerCanvasHandlers(io, socket);

  socket.on("disconnect", (reason) => {
    console.log(`[socket] ${userId} disconnected (${reason})`);
  });
}
