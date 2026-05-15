"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  MessageSquare,
  Sparkles,
  StickyNote,
  Search,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn, initials } from "@/lib/utils";
import { APP_NAME } from "@/config/constants";
import { useWorkspaceStore } from "@/stores/workspace-store";

/**
 * Left navigation rail — static on desktop (lg+), an animated slide-in
 * drawer on smaller screens. Linear/Vercel-style: workspace identity,
 * section nav, a live member list with presence dots, and the ⌘K hint.
 */
export function AppSidebar({
  open,
  onClose,
  onOpenPalette,
}: {
  open: boolean;
  onClose: () => void;
  onOpenPalette: () => void;
}) {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const presence = useWorkspaceStore((s) => s.presence);

  function navigate(panelId: string) {
    document
      .getElementById(panelId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    onClose();
  }

  const body = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <span className="truncate text-sm font-semibold">{APP_NAME}</span>
      </div>

      {/* Section nav */}
      <nav className="space-y-1 p-3">
        <SidebarItem
          icon={<MessageSquare className="h-4 w-4" />}
          label="Conversation"
          onClick={() => navigate("panel-chat")}
        />
        <SidebarItem
          icon={<StickyNote className="h-4 w-4" />}
          label="Shared Notes"
          onClick={() => navigate("panel-notes")}
        />
      </nav>

      <Separator />

      {/* Members */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3 scrollbar-thin">
        <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Members
        </p>
        <ul className="space-y-1">
          {workspace?.members.map((m) => {
            const live = presence.has(m.userId);
            return (
              <li
                key={m.userId}
                className="flex items-center gap-2 rounded-md px-2 py-1.5"
              >
                <div className="relative">
                  <Avatar className="h-6 w-6">
                    {m.user.avatarUrl && (
                      <AvatarImage
                        src={m.user.avatarUrl}
                        alt={m.user.name ?? ""}
                      />
                    )}
                    <AvatarFallback className="text-[10px]">
                      {initials(m.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card",
                      live ? "bg-emerald-500" : "bg-muted-foreground/40",
                    )}
                  />
                </div>
                <span className="truncate text-sm">
                  {m.user.name ?? "Anonymous"}
                </span>
                {live && (
                  <span className="ml-auto text-[10px] text-emerald-500">
                    online
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <Separator />

      {/* Command palette hint */}
      <div className="p-3">
        <button
          onClick={() => {
            onClose();
            onOpenPalette();
          }}
          className="flex w-full items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Search className="h-4 w-4" />
          <span>Search & commands</span>
          <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
            ⌘K
          </kbd>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden w-60 shrink-0 border-r bg-card/40 lg:block">
        {body}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-card lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
            >
              {body}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function SidebarItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {icon}
      {label}
    </button>
  );
}
