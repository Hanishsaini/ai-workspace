import Redis from "ioredis";
import { getServerEnv } from "@/config/env";

/**
 * Singleton ioredis connections. We keep a dedicated publisher separate from
 * the general-purpose client: a connection in subscriber mode cannot issue
 * normal commands, and we want to keep the option open without surprises.
 *
 * LAZY INITIALIZATION
 * Connections must NOT open at module-load time. Next.js's `collect page data`
 * build step imports every route module to introspect handler metadata, and
 * if `new Redis(url)` ran there it would try to dial Upstash from the build
 * sandbox and fail with "Failed to collect page data". The Proxy below defers
 * `create()` until the first property access — which only happens inside a
 * handler at request time.
 */
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
  redisPub: Redis | undefined;
};

function create() {
  return new Redis(getServerEnv().REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    // Let the OS pick IPv4/IPv6 — Upstash hostnames sometimes resolve
    // IPv6-only on certain Windows networks; the default (family: 4) fails
    // there with ENETUNREACH. `0` = no preference.
    family: 0,
  });
}

function lazyClient(slot: "redis" | "redisPub"): Redis {
  return new Proxy({} as Redis, {
    get(_t, prop, receiver) {
      let instance = globalForRedis[slot];
      if (!instance) {
        instance = create();
        if (process.env.NODE_ENV !== "production") {
          globalForRedis[slot] = instance;
        }
      }
      const value = Reflect.get(instance, prop, instance);
      return typeof value === "function" ? value.bind(instance) : value;
    },
  });
}

export const redis: Redis = lazyClient("redis");
export const redisPub: Redis = lazyClient("redisPub");
