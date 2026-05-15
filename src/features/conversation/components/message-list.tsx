"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConversation } from "../hooks/use-conversation";
import { useAiStream } from "../hooks/use-ai-stream";
import { MessageBubble } from "./message-bubble";
import { AiStreamRenderer } from "./ai-stream-renderer";

/** Scrollable transcript: settled messages + the live streaming bubble. */
export function MessageList() {
  const { messages } = useConversation();
  const activeRun = useAiStream();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Keep pinned to the newest content as messages + tokens arrive.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activeRun?.buffer]);

  return (
    <ScrollArea className="h-full scrollbar-thin">
      <div className="divide-y divide-border/40">
        {messages.length === 0 && !activeRun && (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            Ask the AI anything — both of you will see the response stream in.
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              layout="position"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <MessageBubble message={m} />
            </motion.div>
          ))}
        </AnimatePresence>
        <AiStreamRenderer />
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
