/** Channel + room naming helpers. Shared so both tiers agree on strings. */

/** Socket.io room a workspace's members all join. */
export const workspaceRoom = (workspaceId: string) => `workspace:${workspaceId}`;

/** Redis pub/sub channel the API tier publishes broadcasts to. */
export const workspaceChannel = (workspaceId: string) =>
  `rt:workspace:${workspaceId}`;

/** Redis pub/sub channel for a single AI streaming run's token deltas. */
export const aiRunChannel = (runId: string) => `rt:ai:run:${runId}`;

/** Glob the socket server PSUBSCRIBEs to pick up every workspace + run. */
export const REALTIME_PATTERN = "rt:*";

/** Redis keys for ephemeral coordination state. */
export const redisKeys = {
  presence: (workspaceId: string) => `presence:${workspaceId}`,
  presenceMember: (workspaceId: string, userId: string) =>
    `presence:${workspaceId}:${userId}`,
  conversationLock: (conversationId: string) =>
    `lock:conversation:${conversationId}`,
  canvasSeq: (canvasId: string) => `seq:canvas:${canvasId}`,
  messageSeq: (conversationId: string) => `seq:conversation:${conversationId}`,
  rateLimit: (userId: string) => `ratelimit:ai:${userId}`,
};
