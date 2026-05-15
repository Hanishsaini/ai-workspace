import {
  chatSubmitSchema,
  chatTypingSchema,
  workspaceRoom,
} from "@workspace/shared";
import { callNextApi } from "../../lib/next-api.js";
import { parseEvent } from "../validate.js";
import type { AppServer, AppSocket } from "../types.js";

/**
 * Chat intents. The socket server does NOT call OpenAI or the database — it
 * forwards `chat:submit` to the Next.js /api/ai/stream route, which persists
 * the user message, runs the model, and publishes token deltas back through
 * Redis. Typing indicators are pure ephemeral relays.
 *
 * Every incoming payload is runtime-validated before it reaches business
 * logic — TypeScript types don't survive the wire.
 */
export function registerChatHandlers(io: AppServer, socket: AppSocket): void {
  const { workspaceId, userId } = socket.data;
  const room = workspaceRoom(workspaceId);

  socket.on("chat:submit", (payload) => {
    const data = parseEvent(chatSubmitSchema, payload, socket, "chat:submit");
    if (!data) return;

    void (async () => {
      const res = await callNextApi(
        "/api/ai/stream",
        {
          clientMsgId: data.clientMsgId,
          conversationId: data.conversationId,
          text: data.text.trim(),
          workspaceId,
        },
        userId,
      );

      if (!res.ok) {
        socket.emit("system:error", {
          message:
            res.status === 409
              ? "The AI is already responding in this conversation."
              : res.status === 429
                ? "You're sending prompts too quickly."
                : "Failed to start the AI response.",
        });
      }
      // Success path emits nothing here: chat:message:created, ai:run:*
      // all arrive via the Redis bridge so both members stay in sync.
    })();
  });

  socket.on("chat:typing", (payload) => {
    const data = parseEvent(chatTypingSchema, payload, socket, "chat:typing");
    if (!data) return;
    socket.to(room).emit("chat:typing", { userId, isTyping: data.isTyping });
  });
}
