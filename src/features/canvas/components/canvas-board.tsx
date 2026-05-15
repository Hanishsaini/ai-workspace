"use client";

import { useRef } from "react";
import { NotesEditor } from "./notes-editor";
import { LiveCursors } from "@/features/presence/components/live-cursors";
import { usePresence } from "@/features/presence/hooks/use-presence";

/**
 * The shared canvas column. Wraps the notes editor and the live-cursor
 * overlay, and tracks the local pointer to broadcast a viewport-relative
 * cursor position (0–1 fractions, so it maps across screen sizes).
 */
export function CanvasBoard() {
  const { broadcastCursor } = usePresence();
  const ref = useRef<HTMLDivElement>(null);

  function handlePointerMove(e: React.PointerEvent) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    broadcastCursor(
      (e.clientX - rect.left) / rect.width,
      (e.clientY - rect.top) / rect.height,
    );
  }

  return (
    <div
      ref={ref}
      onPointerMove={handlePointerMove}
      className="relative h-full border-l bg-card/20"
    >
      <div className="flex h-11 items-center border-b px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Shared Notes
      </div>
      <div className="h-[calc(100%-2.75rem)]">
        <NotesEditor />
      </div>
      <LiveCursors />
    </div>
  );
}
