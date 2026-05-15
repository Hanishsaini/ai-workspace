import "server-only";
import type { Message } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { listRecentMessages } from "@/features/conversation/server/message.repository";
import {
  AI_CANVAS_DIGEST_BLOCKS,
  AI_CANVAS_DIGEST_CHARS,
  AI_CONTEXT_MESSAGE_WINDOW,
  AI_MAX_MESSAGE_CHARS,
  AI_MAX_OUTPUT_TOKENS,
} from "@/config/constants";
import type { AiStreamInput } from "./ai-service";

const SYSTEM_PROMPT = `You are the shared AI assistant inside a real-time collaborative workspace.
Two people may be talking to you at once — treat the conversation as a single
shared thread, not separate DMs. Be concise, concrete, and helpful.`;

/**
 * Builds the model input for one conversation turn under a tight free-tier
 * budget:
 *
 *  - System prompt + the conversation's rolling summary (older history,
 *    bounded by the summarizer)
 *  - The last `AI_CONTEXT_MESSAGE_WINDOW` completed messages, each
 *    truncated to `AI_MAX_MESSAGE_CHARS` so a single huge paste can't
 *    blow the context window
 *  - A small digest of the shared canvas (capped block count + char cap)
 *  - `maxTokens` baked in so completions can't burn quota unbounded
 *
 * Nothing older than the verbatim window is sent — `memory.ts` rolls older
 * turns into `Conversation.summary` instead.
 */
export async function buildContext(
  conversationId: string,
  workspaceId: string,
): Promise<AiStreamInput> {
  const [conversation, recent, canvas] = await Promise.all([
    prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { summary: true },
    }),
    listRecentMessages(conversationId, AI_CONTEXT_MESSAGE_WINDOW),
    prisma.canvasDocument.findFirst({
      where: { workspaceId },
      select: { snapshot: true },
    }),
  ]);

  const summary = conversation?.summary
    ? `\n\nConversation so far (summary of earlier turns):\n${truncate(
        conversation.summary,
        AI_MAX_MESSAGE_CHARS,
      )}`
    : "";

  const canvasDigest = digestCanvas(canvas?.snapshot);
  const canvasSection = canvasDigest
    ? `\n\nShared canvas/notes (read-only context):\n${canvasDigest}`
    : "";

  return {
    instructions: `${SYSTEM_PROMPT}${summary}${canvasSection}`,
    input: recent
      .filter((m): m is Message => m.role === "USER" || m.role === "ASSISTANT")
      .map((m) => ({
        role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
        content: truncate(m.content, AI_MAX_MESSAGE_CHARS),
      })),
    maxTokens: AI_MAX_OUTPUT_TOKENS,
  };
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function digestCanvas(snapshot: unknown): string {
  if (!snapshot || typeof snapshot !== "object") return "";
  const blocks = (snapshot as { blocks?: Array<{ text?: string }> }).blocks;
  if (!Array.isArray(blocks) || blocks.length === 0) return "";

  const lines = blocks
    .map((b) => b.text?.trim())
    .filter((t): t is string => Boolean(t))
    .slice(0, AI_CANVAS_DIGEST_BLOCKS);

  return truncate(lines.join("\n"), AI_CANVAS_DIGEST_CHARS);
}
