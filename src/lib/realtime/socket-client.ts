"use client";

import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@workspace/shared";
import { clientEnv } from "@/config/env";

export type AppClientSocket = Socket<
  ServerToClientEvents,
  ClientToServerEvents
>;

/**
 * Creates a typed socket.io client.
 *
 * `auth` is the CALLBACK form, not a static object — socket.io invokes it
 * before every (re)connection attempt. The realtime token is short-lived
 * (5 min), so a baked-in token would make reconnects fail once it expires.
 * Re-minting on each attempt means a reconnection after a long network drop
 * still authenticates cleanly.
 */
export function createSocket(
  getToken: () => Promise<string>,
): AppClientSocket {
  return io(clientEnv.NEXT_PUBLIC_SOCKET_URL, {
    transports: ["websocket"],
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    auth: async (cb) => {
      try {
        cb({ token: await getToken() });
      } catch {
        // Empty token → server rejects → socket.io schedules another retry.
        cb({ token: "" });
      }
    },
  });
}
