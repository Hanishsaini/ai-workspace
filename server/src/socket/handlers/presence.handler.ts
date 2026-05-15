import {
  presenceCursorSchema,
  workspaceRoom,
  type PresenceUser,
} from "@workspace/shared";
import {
  getPresence,
  removePresence,
  setPresence,
  touchPresence,
} from "../../redis/presence.js";
import { callNextApi } from "../../lib/next-api.js";
import { parseEvent } from "../validate.js";
import type { AppServer, AppSocket } from "../types.js";

/**
 * Presence + live cursors. Redis is the live, ephemeral layer; cursor moves
 * are relayed room-wide but never stored. Connect/disconnect transitions
 * also fire a durable beacon to the API tier (the socket server holds no DB
 * access) so PresenceState reflects last-seen across restarts.
 */
export function registerPresenceHandlers(
  io: AppServer,
  socket: AppSocket,
): void {
  const { workspaceId, userId, name, avatarUrl, cursorColor } = socket.data;
  const room = workspaceRoom(workspaceId);

  const self: PresenceUser = {
    userId,
    name,
    avatarUrl,
    cursorColor,
    status: "online",
    lastSeen: Date.now(),
  };

  // On connect: register in Redis, hand this socket the full snapshot, tell
  // the room, and persist the ONLINE transition durably.
  void (async () => {
    await setPresence(workspaceId, self);
    const users = await getPresence(workspaceId);
    socket.emit("presence:state", { users });
    socket.to(room).emit("presence:update", { user: self });
    void callNextApi(
      "/api/realtime/presence",
      { workspaceId, status: "ONLINE" },
      userId,
    );
  })();

  socket.on("presence:heartbeat", () => {
    void touchPresence(workspaceId, userId);
  });

  socket.on("presence:cursor", (payload) => {
    const data = parseEvent(
      presenceCursorSchema,
      payload,
      socket,
      "presence:cursor",
    );
    if (!data) return;
    // Relay only — cursor positions are never persisted.
    socket.to(room).emit("presence:cursor", { userId, x: data.x, y: data.y });
  });

  socket.on("disconnect", () => {
    void (async () => {
      await removePresence(workspaceId, userId);
      io.to(room).emit("presence:leave", { userId });
      void callNextApi(
        "/api/realtime/presence",
        { workspaceId, status: "OFFLINE" },
        userId,
      );
    })();
  });
}
