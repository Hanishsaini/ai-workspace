import { redisKeys, type PresenceUser } from "@workspace/shared";
import { PRESENCE_TTL_SECONDS } from "@/config/constants";
import { redis } from "./client";

/**
 * Presence lives only in Redis — high churn, ephemeral, never the source of
 * truth. Each member is a hash field under the workspace key; we sweep stale
 * entries on read rather than relying on per-field TTL (hashes can't do that).
 */

interface StoredPresence extends PresenceUser {}

export async function setPresence(
  workspaceId: string,
  user: PresenceUser,
): Promise<void> {
  const key = redisKeys.presence(workspaceId);
  await redis.hset(key, user.userId, JSON.stringify(user));
  await redis.expire(key, PRESENCE_TTL_SECONDS * 4);
}

export async function touchPresence(
  workspaceId: string,
  userId: string,
): Promise<void> {
  const key = redisKeys.presence(workspaceId);
  const raw = await redis.hget(key, userId);
  if (!raw) return;
  const user = JSON.parse(raw) as StoredPresence;
  user.lastSeen = Date.now();
  user.status = "online";
  await redis.hset(key, userId, JSON.stringify(user));
}

export async function removePresence(
  workspaceId: string,
  userId: string,
): Promise<void> {
  await redis.hdel(redisKeys.presence(workspaceId), userId);
}

export async function getPresence(
  workspaceId: string,
): Promise<PresenceUser[]> {
  const key = redisKeys.presence(workspaceId);
  const entries = await redis.hgetall(key);
  const now = Date.now();
  const ttlMs = PRESENCE_TTL_SECONDS * 1000;
  const live: PresenceUser[] = [];
  const stale: string[] = [];

  for (const [userId, raw] of Object.entries(entries)) {
    const user = JSON.parse(raw) as StoredPresence;
    if (now - user.lastSeen > ttlMs) {
      stale.push(userId);
      continue;
    }
    live.push(user);
  }

  if (stale.length) await redis.hdel(key, ...stale);
  return live;
}
