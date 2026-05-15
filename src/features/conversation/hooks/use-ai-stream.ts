"use client";

import { useWorkspaceStore } from "@/stores/workspace-store";

/**
 * Subscribes only to the active AI run. `ai:run:delta` is the highest-
 * frequency mutation in the app, so isolating it behind a narrow selector
 * keeps re-renders scoped to the streaming bubble.
 */
export function useAiStream() {
  return useWorkspaceStore((s) => s.activeRun);
}
