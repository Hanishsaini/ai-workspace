"use client";

import { useCallback, useMemo, useRef } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { CURSOR_THROTTLE_MS } from "@/config/constants";

/**
 * Presence surface: the live member list, remote cursors, typing state, and
 * a throttled `broadcastCursor`. Cursor moves are high-frequency, so we
 * rate-limit emits client-side before they ever hit the socket.
 */
export function usePresence() {
  const { socket } = useSocket();
  const presence = useWorkspaceStore((s) => s.presence);
  const cursors = useWorkspaceStore((s) => s.cursors);
  const typingUserIds = useWorkspaceStore((s) => s.typingUserIds);
  const lastEmit = useRef(0);

  const members = useMemo(() => Array.from(presence.values()), [presence]);

  const broadcastCursor = useCallback(
    (x: number, y: number) => {
      const now = Date.now();
      if (now - lastEmit.current < CURSOR_THROTTLE_MS) return;
      lastEmit.current = now;
      socket?.emit("presence:cursor", { x, y });
    },
    [socket],
  );

  return { members, cursors, typingUserIds, broadcastCursor };
}
