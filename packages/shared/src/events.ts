/**
 * THE socket contract. Shared verbatim by the Next.js app (socket.io-client)
 * and the standalone socket server (socket.io). Changing an event here is a
 * breaking protocol change — treat this file as an API surface.
 */

import type {
  CanvasOp,
  CanvasOpApplied,
  MessageDTO,
  PresenceUser,
  WorkspaceMemberDTO,
} from "./domain";

// ─── Client → Server ────────────────────────────────────────────────────
export interface ClientToServerEvents {
  "presence:join": (p: { workspaceId: string }) => void;
  "presence:heartbeat": () => void;
  "presence:cursor": (p: { x: number; y: number }) => void;
  "chat:submit": (p: {
    clientMsgId: string;
    conversationId: string;
    text: string;
  }) => void;
  "chat:typing": (p: { isTyping: boolean }) => void;
  "canvas:op": (p: { canvasId: string; op: CanvasOp }) => void;
}

// ─── Server → Client ────────────────────────────────────────────────────
export interface ServerToClientEvents {
  "presence:state": (p: { users: PresenceUser[] }) => void;
  "presence:update": (p: { user: PresenceUser }) => void;
  "presence:leave": (p: { userId: string }) => void;
  "presence:cursor": (p: { userId: string; x: number; y: number }) => void;
  "chat:typing": (p: { userId: string; isTyping: boolean }) => void;
  "chat:message:created": (p: { message: MessageDTO }) => void;
  "ai:run:started": (p: {
    runId: string;
    conversationId: string;
    messageId: string;
  }) => void;
  "ai:run:delta": (p: { runId: string; token: string }) => void;
  "ai:run:completed": (p: { runId: string; message: MessageDTO }) => void;
  "ai:run:error": (p: { runId: string; error: string }) => void;
  "canvas:op:applied": (p: CanvasOpApplied) => void;
  "workspace:member:added": (p: { member: WorkspaceMemberDTO }) => void;
  "system:error": (p: { message: string }) => void;
}

// ─── Inter-server (Redis adapter) ───────────────────────────────────────
export interface InterServerEvents {
  ping: () => void;
}

// ─── Per-socket data populated by auth middleware ───────────────────────
export interface SocketData {
  userId: string;
  workspaceId: string;
  name: string | null;
  avatarUrl: string | null;
  cursorColor: string;
}

/**
 * Envelope used on Redis pub/sub channels that bridge the Vercel API tier
 * to the socket server. The socket server re-emits `event`/`payload` into
 * the matching workspace room.
 */
export interface RealtimeEnvelope<
  E extends keyof ServerToClientEvents = keyof ServerToClientEvents,
> {
  workspaceId: string;
  event: E;
  payload: Parameters<ServerToClientEvents[E]>[0];
}
