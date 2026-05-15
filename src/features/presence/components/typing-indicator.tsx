"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePresence } from "../hooks/use-presence";
import { useWorkspaceStore } from "@/stores/workspace-store";

/** "Alice is typing…" — driven purely by ephemeral presence state. */
export function TypingIndicator() {
  const { typingUserIds } = usePresence();
  const presence = useWorkspaceStore((s) => s.presence);

  const names = Array.from(typingUserIds)
    .map((id) => presence.get(id)?.name ?? "Someone")
    .slice(0, 2);

  return (
    <AnimatePresence initial={false}>
      {names.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-2 overflow-hidden px-4 py-1 text-xs text-muted-foreground"
        >
          <span className="flex gap-0.5">
            <span className="h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-muted-foreground" />
            <span className="h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-muted-foreground [animation-delay:200ms]" />
            <span className="h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-muted-foreground [animation-delay:400ms]" />
          </span>
          {names.join(" and ")} {names.length === 1 ? "is" : "are"} typing…
        </motion.div>
      )}
    </AnimatePresence>
  );
}
