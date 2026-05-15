import type { ZodSchema } from "zod";
import type { AppSocket } from "./types.js";

/**
 * Validates an untrusted client→server event payload. On failure it tells
 * the offending client via `system:error` and returns null so the handler
 * can bail — a bad payload is never allowed to reach business logic or get
 * relayed to other room members.
 */
export function parseEvent<T>(
  schema: ZodSchema<T>,
  payload: unknown,
  socket: AppSocket,
  eventName: string,
): T | null {
  const result = schema.safeParse(payload);
  if (!result.success) {
    console.warn(
      `[socket] rejected ${eventName} from ${socket.data.userId}:`,
      result.error.issues,
    );
    socket.emit("system:error", {
      message: `Invalid ${eventName} payload.`,
    });
    return null;
  }
  return result.data;
}
