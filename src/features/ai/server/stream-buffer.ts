import "server-only";
import { publishAiDelta } from "@/lib/realtime/publish";
import { updateStreamingContent } from "@/features/conversation/server/message.repository";
import {
  AI_STREAM_PERSIST_INTERVAL_MS,
  AI_STREAM_PUBLISH_CHAR_THRESHOLD,
  AI_STREAM_PUBLISH_INTERVAL_MS,
} from "@/config/constants";

/**
 * Token buffering + incremental persistence for a single AI streaming run.
 *
 * Two independent cadences, both checked on each `push` (no timers — keeps
 * it serverless-safe):
 *
 *  1. PUBLISH (fan-out)   — raw model deltas are coalesced and flushed to the
 *     Redis per-run channel when the pending segment hits the char threshold
 *     OR the publish interval elapses. Still feels token-by-token to both
 *     users, but collapses hundreds of tiny publishes into a handful.
 *
 *  2. PERSIST (durability) — the full accumulated content is written to
 *     Postgres at most once per persist interval. This is the interrupt-
 *     safety checkpoint: a crash or function timeout mid-stream leaves a
 *     partial-but-saved message instead of losing the whole response.
 *
 * `finalize()` flushes both one last time and returns the complete text.
 */
export class StreamBuffer {
  private full = "";
  private pendingPublish = "";
  private lastPublishAt = 0;
  private lastPersistAt = 0;
  private persisting: Promise<unknown> | null = null;

  constructor(
    private readonly workspaceId: string,
    private readonly runId: string,
    private readonly messageId: string,
  ) {
    const now = Date.now();
    this.lastPublishAt = now;
    this.lastPersistAt = now;
  }

  /** The full text accumulated so far. */
  get content(): string {
    return this.full;
  }

  /** Feed one raw model delta. May trigger a coalesced publish / a persist. */
  async push(token: string): Promise<void> {
    this.full += token;
    this.pendingPublish += token;

    const now = Date.now();

    const shouldPublish =
      this.pendingPublish.length >= AI_STREAM_PUBLISH_CHAR_THRESHOLD ||
      now - this.lastPublishAt >= AI_STREAM_PUBLISH_INTERVAL_MS;
    if (shouldPublish) await this.flushPublish();

    if (now - this.lastPersistAt >= AI_STREAM_PERSIST_INTERVAL_MS) {
      this.schedulePersist();
    }
  }

  /** Final flush of both cadences. Returns the complete accumulated text. */
  async finalize(): Promise<string> {
    await this.flushPublish();
    await this.persisting; // let any in-flight checkpoint settle
    return this.full;
  }

  private async flushPublish(): Promise<void> {
    if (!this.pendingPublish) return;
    const chunk = this.pendingPublish;
    this.pendingPublish = "";
    this.lastPublishAt = Date.now();
    await publishAiDelta(this.workspaceId, this.runId, chunk);
  }

  /**
   * Fire-and-forget DB checkpoint. We never await it on the hot path — a
   * slow write must not stall token fan-out — but we keep the promise so
   * `finalize()` can drain it, and we serialize so checkpoints can't race.
   */
  private schedulePersist(): void {
    if (this.persisting) return;
    this.lastPersistAt = Date.now();
    const snapshot = this.full;
    this.persisting = updateStreamingContent(this.messageId, snapshot)
      .catch((err) => {
        console.error(
          `[stream-buffer] checkpoint failed for ${this.messageId}:`,
          err,
        );
      })
      .finally(() => {
        this.persisting = null;
      });
  }
}
