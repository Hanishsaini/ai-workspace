"use client";

import { useRef, useState } from "react";
import type { WorkspaceSnapshot } from "@workspace/shared";
import { SocketProvider } from "@/components/providers/socket-provider";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { WorkspaceHeader } from "./workspace-header";
import { CommandPalette } from "./command-palette";
import { ConversationPanel } from "@/features/conversation/components/conversation-panel";
import { CanvasBoard } from "@/features/canvas/components/canvas-board";

/**
 * The realtime boundary for a workspace session. Hydrates the Zustand store
 * from the server-rendered snapshot BEFORE the socket connects (so the first
 * paint is correct and incoming deltas merge onto real state), then mounts
 * the chrome: sidebar rail, header, the two-column workspace, and the ⌘K
 * command palette.
 *
 * Mobile: the sidebar collapses to an animated drawer; panels stack.
 */
export function WorkspaceShell({
  snapshot,
}: {
  snapshot: WorkspaceSnapshot;
}) {
  // Hydrate exactly once, synchronously, before children read the store.
  const hydrated = useRef(false);
  if (!hydrated.current) {
    useWorkspaceStore.getState().hydrate(snapshot);
    hydrated.current = true;
  }

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <SocketProvider workspaceId={snapshot.workspace.id}>
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpenPalette={() => setPaletteOpen(true)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <WorkspaceHeader
            onMenuClick={() => setSidebarOpen(true)}
            onOpenPalette={() => setPaletteOpen(true)}
          />

          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[1fr_minmax(360px,460px)] lg:overflow-hidden">
            <section id="panel-chat" className="min-h-0 max-lg:h-[88vh]">
              <ConversationPanel />
            </section>
            <section
              id="panel-notes"
              className="min-h-0 border-t max-lg:h-[88vh] lg:border-t-0"
            >
              <CanvasBoard />
            </section>
          </div>
        </div>

        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      </div>
    </SocketProvider>
  );
}
