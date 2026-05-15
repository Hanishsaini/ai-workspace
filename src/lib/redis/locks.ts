import { randomUUID } from "crypto";
import { redis } from "./client";

/**
 * Minimal single-instance Redlock-lite. Enough to serialize one AI run per
 * conversation across stateless serverless invocations. The token guards
 * against a slow holder releasing a lock that has since been re-acquired.
 */

const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

export interface Lock {
  key: string;
  token: string;
}

export async function acquireLock(
  key: string,
  ttlSeconds: number,
): Promise<Lock | null> {
  const token = randomUUID();
  const ok = await redis.set(key, token, "EX", ttlSeconds, "NX");
  return ok === "OK" ? { key, token } : null;
}

export async function releaseLock(lock: Lock): Promise<void> {
  await redis.eval(RELEASE_SCRIPT, 1, lock.key, lock.token);
}

/** Run `fn` only if the lock is free; returns null if already held. */
export async function withLock<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T | null> {
  const lock = await acquireLock(key, ttlSeconds);
  if (!lock) return null;
  try {
    return await fn();
  } finally {
    await releaseLock(lock);
  }
}
