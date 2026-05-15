"use client";

import { useCallback } from "react";
import { nanoid } from "nanoid";
import { useSocket } from "@/components/providers/socket-provider";
import { useWorkspaceStore } from "@/stores/workspace-store";

/**
 * Conversation surface: the ordered message list plus the `sendPrompt`
 * intent. The user message is NOT added optimistically — it round-trips
 * through the server so both members see it with an authoritative
 * `serverSeq`. The composer just shows a pending state until the echo lands.
 */
export function useConversation() {
  const { socket } = useSocket();
  const messages = useWorkspaceStore((s) => s.messages);
  const conversation = useWorkspaceStore((s) => s.conversation);
  const activeRun = useWorkspaceStore((s) => s.activeRun);

  const sendPrompt = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !socket || !conversation) return null;
      const clientMsgId = nanoid();
      socket.emit("chat:submit", {
        clientMsgId,
        conversationId: conversation.id,
        text: trimmed,
      });
      return clientMsgId;
    },
    [socket, conversation],
  );

  const setTyping = useCallback(
    (isTyping: boolean) => {
      socket?.emit("chat:typing", { isTyping });
    },
    [socket],
  );

  return {
    conversation,
    messages,
    isAiResponding: activeRun !== null,
    sendPrompt,
    setTyping,
  };
}
