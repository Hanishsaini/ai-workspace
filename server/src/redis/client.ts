import Redis from "ioredis";
import { env } from "../config/env.js";

/**
 * Four independent ioredis connections — the socket.io Redis adapter, the
 * pattern subscriber for the rt:* fan-out bridge, and the general command
 * client all need their own sockets (a subscriber connection can't issue
 * normal commands). Each gets a label so logs make the source obvious.
 *
 * For Upstash specifically:
 *  - `rediss://` URLs auto-enable TLS in ioredis (no explicit `tls` block
 *    needed; default SNI uses the hostname from the URL)
 *  - `family: 0` lets the OS pick IPv4/IPv6 — Upstash hostnames sometimes
 *    resolve IPv6-only on Windows where the ioredis default (family: 4)
 *    fails with ENETUNREACH
 *  - `maxRetriesPerRequest: null` keeps commands queued during reconnect
 *    instead of failing them, which the pub/sub adapter relies on
 */

function safeHost(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}:${u.port || "6379"}`;
  } catch {
    return "<invalid REDIS_URL>";
  }
}

function create(label: string): Redis {
  const client = new Redis(env.REDIS_URL, {
    connectionName: `aiw-${label}`,
    maxRetriesPerRequest: null,
    family: 0,
    enableReadyCheck: true,
    retryStrategy: (times) => Math.min(times * 200, 5000),
    reconnectOnError: (err) => {
      // ioredis recommendation: only auto-reconnect on READONLY (failover).
      // Everything else uses normal reconnection via retryStrategy.
      return err.message.includes("READONLY");
    },
  });

  client.on("connect", () =>
    console.log(`[redis:${label}] connecting → ${safeHost(env.REDIS_URL)}`),
  );
  client.on("ready", () =>
    console.log(`[redis:${label}] ready`),
  );
  client.on("error", (err) =>
    // Single 'error' handler suppresses the "Unhandled error event" spam
    // and gives us one clean line per actual failure.
    console.error(`[redis:${label}] error: ${err.message}`),
  );
  client.on("reconnecting", (delay: number) =>
    console.warn(`[redis:${label}] reconnecting in ${delay}ms`),
  );
  client.on("end", () =>
    console.warn(`[redis:${label}] connection closed`),
  );

  return client;
}

// Four independent connections — the socket.io adapter needs separate
// pub + sub sockets, the rt:* bridge needs its own subscriber, and the
// general command client (presence reads/writes) can't share a socket
// with anything in subscriber mode.
export const redis = create("commands");
export const pubClient = create("pub");
export const subClient = create("sub");
export const streamSub = create("stream");
