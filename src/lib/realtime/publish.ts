import {
  aiRunChannel,
  workspaceChannel,
  type RealtimeEnvelope,
  type ServerToClientEvents,
} from "@workspace/shared";
import { redisPub } from "@/lib/redis/client";

/**
 * The bridge from the Vercel API tier to the socket server. Route handlers
 * never touch sockets directly — they publish an envelope to Redis, and the
 * socket server's pattern subscriber fans it into the workspace room.
 *
 * This is the seam that keeps the realtime transport swappable.
 */
export async function publishToWorkspace<E extends keyof ServerToClientEvents>(
  workspaceId: string,
  event: E,
  payload: Parameters<ServerToClientEvents[E]>[0],
): Promise<void> {
  const envelope: RealtimeEnvelope<E> = { workspaceId, event, payload };
  await redisPub.publish(workspaceChannel(workspaceId), JSON.stringify(envelope));
}

/**
 * AI token deltas go on a per-run channel so a late subscriber (reconnecting
 * client, second socket-server instance) can attach mid-stream. The socket
 * server relays these into the workspace room too.
 */
export async function publishAiDelta(
  workspaceId: string,
  runId: string,
  token: string,
): Promise<void> {
  const envelope: RealtimeEnvelope<"ai:run:delta"> = {
    workspaceId,
    event: "ai:run:delta",
    payload: { runId, token },
  };
  await redisPub.publish(aiRunChannel(runId), JSON.stringify(envelope));
}
