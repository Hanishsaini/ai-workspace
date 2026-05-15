"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { usePresence } from "../hooks/use-presence";

/**
 * Remote members' cursors as an absolutely-positioned overlay. Coordinates
 * are workspace-relative fractions (0–1) so they map across viewport sizes.
 * Position is spring-animated — the cursor glides between throttled updates
 * instead of teleporting, which is what sells the "in the room together"
 * feel. Drop this inside a `relative` container.
 */
export function LiveCursors() {
  const { cursors } = usePresence();
  const presence = useWorkspaceStore((s) => s.presence);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <AnimatePresence>
        {Array.from(cursors.entries()).map(([userId, pos]) => {
          const member = presence.get(userId);
          if (!member) return null;
          return (
            <motion.div
              key={userId}
              className="absolute top-0 left-0"
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                left: `${pos.x * 100}%`,
                top: `${pos.y * 100}%`,
              }}
              exit={{ opacity: 0 }}
              transition={{
                left: { type: "spring", stiffness: 700, damping: 45 },
                top: { type: "spring", stiffness: 700, damping: 45 },
                opacity: { duration: 0.15 },
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M2 2L16 8L9 9.5L7 16L2 2Z"
                  fill={member.cursorColor}
                  stroke="white"
                  strokeWidth="1"
                />
              </svg>
              <span
                className="ml-3 rounded px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm"
                style={{ backgroundColor: member.cursorColor }}
              >
                {member.name ?? "Anonymous"}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
