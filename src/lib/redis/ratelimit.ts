import { redisKeys } from "@workspace/shared";
import {
  AI_RATE_LIMIT_MAX,
  AI_RATE_LIMIT_WINDOW_SECONDS,
} from "@/config/constants";
import { redis } from "./client";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

/**
 * Fixed-window counter. Simple and good enough for per-user AI throttling;
 * swap for a sliding window or token bucket if burst smoothing matters.
 */
export async function checkAiRateLimit(
  userId: string,
): Promise<RateLimitResult> {
  const key = redisKeys.rateLimit(userId);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, AI_RATE_LIMIT_WINDOW_SECONDS);
  }
  const ttl = await redis.ttl(key);
  return {
    allowed: count <= AI_RATE_LIMIT_MAX,
    remaining: Math.max(0, AI_RATE_LIMIT_MAX - count),
    resetSeconds: ttl < 0 ? AI_RATE_LIMIT_WINDOW_SECONDS : ttl,
  };
}
