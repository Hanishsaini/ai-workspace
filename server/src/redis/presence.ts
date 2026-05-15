import { redisKeys, type PresenceUser } from "@workspace/shared";
import { redis } from "./client.js";

/**
 * Presence store, socket-server side. Mirrors the API tier's helper — both
 * read/write the same Redis hash so a member added by either tier is visible
 * to the other. TTL-on-key plus lazy sweep-on-read keeps it self-healing.
 */

const TTL_SECONDS = 30;

export async function setPresence(
  workspaceId: string,
  user: PresenceUser,
): Promise<void> {
  const key = redisKeys.presence(workspaceId);
  await redis.hset(key, user.userId, JSON.stringify(user));
  await redis.expire(key, TTL_SECONDS * 4);
}

export async function touchPresence(
  workspaceId: string,
  userId: string,
): Promise<PresenceUser | null> {
  const key = redisKeys.presence(workspaceId);
  const raw = await redis.hget(key, userId);
  if (!raw) return null;
  const user = JSON.parse(raw) as PresenceUser;
  user.lastSeen = Date.now();
  user.status = "online";
  await redis.hset(key, userId, JSON.stringify(user));
  return user;
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
  const ttlMs = TTL_SECONDS * 1000;
  const live: PresenceUser[] = [];
  const stale: string[] = [];

  for (const [userId, raw] of Object.entries(entries)) {
    const user = JSON.parse(raw) as PresenceUser;
    if (now - user.lastSeen > ttlMs) stale.push(userId);
    else live.push(user);
  }
  if (stale.length) await redis.hdel(key, ...stale);
  return live;
}
