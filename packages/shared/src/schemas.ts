/**
 * Runtime validation for untrusted client → server socket payloads. The
 * TypeScript event maps in events.ts give compile-time safety; these zod
 * schemas give runtime safety against a malicious or buggy client. Shared
 * so the socket server validates and the browser can pre-validate.
 */

import { z } from "zod";

export const presenceJoinSchema = z.object({
  workspaceId: z.string().min(1).max(64),
});

/** Cursor coords are viewport-relative fractions (0–1). */
export const presenceCursorSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const chatSubmitSchema = z.object({
  clientMsgId: z.string().min(1).max(64),
  conversationId: z.string().min(1).max(64),
  text: z.string().min(1).max(8000),
});

export const chatTypingSchema = z.object({
  isTyping: z.boolean(),
});

export const canvasOpSchema = z.object({
  canvasId: z.string().min(1).max(64),
  op: z.object({
    opId: z.string().min(1).max(64),
    type: z.enum(["insert", "update", "delete"]),
    payload: z.unknown(),
  }),
});

export type PresenceJoinPayload = z.infer<typeof presenceJoinSchema>;
export type PresenceCursorPayload = z.infer<typeof presenceCursorSchema>;
export type ChatSubmitPayload = z.infer<typeof chatSubmitSchema>;
export type ChatTypingPayload = z.infer<typeof chatTypingSchema>;
export type CanvasOpPayload = z.infer<typeof canvasOpSchema>;
