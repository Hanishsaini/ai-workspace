import Redis from "ioredis";
import { getServerEnv } from "@/config/env";

/**
 * Singleton ioredis connections. We keep a dedicated publisher separate from
 * the general-purpose client: a connection in subscriber mode cannot issue
 * normal commands, and we want to keep the option open without surprises.
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

export const redis = globalForRedis.redis ?? create();
export const redisPub = globalForRedis.redisPub ?? create();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
  globalForRedis.redisPub = redisPub;
}
