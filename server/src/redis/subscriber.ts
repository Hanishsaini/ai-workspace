import { REALTIME_PATTERN, type RealtimeEnvelope } from "@workspace/shared";
import { workspaceRoom } from "@workspace/shared";
import { streamSub } from "./client.js";
import type { AppServer } from "../socket/types.js";

/**
 * The Redis → socket bridge. The Vercel API tier publishes RealtimeEnvelopes
 * to `rt:*` channels (workspace broadcasts + per-AI-run token deltas). We
 * PSUBSCRIBE once and fan each envelope into its workspace room.
 *
 * Because this is keyed off Redis (not a client connection), a reconnecting
 * client or a freshly scaled instance picks up in-flight streams correctly.
 */
export function startRealtimeSubscriber(io: AppServer): void {
  streamSub.psubscribe(REALTIME_PATTERN, (err) => {
    if (err) {
      console.error("[subscriber] psubscribe failed:", err);
      return;
    }
    console.log(`[subscriber] listening on ${REALTIME_PATTERN}`);
  });

  streamSub.on("pmessage", (_pattern, _channel, message) => {
    let envelope: RealtimeEnvelope;
    try {
      envelope = JSON.parse(message) as RealtimeEnvelope;
    } catch {
      console.error("[subscriber] malformed envelope:", message);
      return;
    }
    const { workspaceId, event, payload } = envelope;
    io.to(workspaceRoom(workspaceId)).emit(event, payload as never);
  });
}
