import { jwtVerify } from "jose";
import { env } from "../config/env.js";
import type { AppSocket } from "./types.js";

/**
 * Connection gate. The client passes the short-lived realtime JWT minted by
 * the Next.js /api/realtime/token route in `handshake.auth.token`. We verify
 * it with the shared secret and hydrate `socket.data` — every downstream
 * handler trusts these fields and never re-reads them off the wire.
 */
const secret = new TextEncoder().encode(env.REALTIME_TOKEN_SECRET);

export async function authMiddleware(
  socket: AppSocket,
  next: (err?: Error) => void,
): Promise<void> {
  try {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Missing realtime token"));

    const { payload } = await jwtVerify(token, secret);

    socket.data.userId = payload.userId as string;
    socket.data.workspaceId = payload.workspaceId as string;
    socket.data.name = (payload.name as string | null) ?? null;
    socket.data.avatarUrl = (payload.avatarUrl as string | null) ?? null;
    socket.data.cursorColor = payload.cursorColor as string;

    if (!socket.data.userId || !socket.data.workspaceId) {
      return next(new Error("Malformed realtime token"));
    }
    next();
  } catch {
    next(new Error("Invalid or expired realtime token"));
  }
}
