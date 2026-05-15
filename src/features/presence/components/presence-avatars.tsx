"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { initials } from "@/lib/utils";
import { usePresence } from "../hooks/use-presence";

/**
 * Stacked avatars of everyone currently in the workspace. Join/leave is
 * spring-animated so the collaborative presence feels live.
 */
export function PresenceAvatars() {
  const { members } = usePresence();

  return (
    <div className="flex items-center">
      <AnimatePresence mode="popLayout" initial={false}>
        {members.map((m) => (
          <motion.div
            key={m.userId}
            layout
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="-ml-2 first:ml-0"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar
                  className="h-8 w-8 ring-2 ring-background transition-transform hover:-translate-y-0.5"
                  style={{ boxShadow: `0 0 0 2px ${m.cursorColor}` }}
                >
                  {m.avatarUrl && (
                    <AvatarImage src={m.avatarUrl} alt={m.name ?? ""} />
                  )}
                  <AvatarFallback>{initials(m.name)}</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                {m.name ?? "Anonymous"}
                {m.status === "away" ? " (away)" : ""}
              </TooltipContent>
            </Tooltip>
          </motion.div>
        ))}
      </AnimatePresence>
      {members.length === 0 && (
        <span className="text-xs text-muted-foreground">No one else here</span>
      )}
    </div>
  );
}
