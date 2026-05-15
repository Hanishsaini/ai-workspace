import "server-only";
import { prisma } from "@/lib/db/prisma";
import {
  countCompleteMessages,
  listMessagesBeforeWindow,
} from "@/features/conversation/server/message.repository";
import {
  AI_CONTEXT_MESSAGE_WINDOW,
  AI_MAX_MESSAGE_CHARS,
  AI_SUMMARY_INTERVAL,
  AI_SUMMARY_MAX_OUTPUT_TOKENS,
} from "@/config/constants";
import { generateText } from "./ai-service";

/**
 * Shared conversation memory — the persistence half of context assembly.
 *
 * The context builder feeds the model the last `AI_CONTEXT_MESSAGE_WINDOW`
 * messages verbatim plus `Conversation.summary`. This module is what keeps
 * that summary current: every `AI_SUMMARY_INTERVAL` completed messages it
 * re-summarizes everything OLDER than the verbatim window, folding the
 * previous summary back in so memory is rolling, not truncated.
 *
 * Called fire-and-forget after a run completes — it must never block or
 * fail the user-facing response.
 */

const SUMMARY_INSTRUCTIONS = `You maintain the rolling memory of a shared AI workspace conversation.
Produce a single dense summary that preserves: decisions made, facts
established, the users' goals, open questions, and any context the
assistant must not forget. Omit pleasantries. Prefer bullet points.
Keep it under 400 words.`;

/** Returns true if a summary refresh was performed. */
export async function maybeRefreshSummary(
  conversationId: string,
): Promise<boolean> {
  const count = await countCompleteMessages(conversationId);

  // Only refresh when the count crosses a summary-interval boundary, and
  // only once there is history beyond the verbatim window to compress.
  if (count === 0 || count % AI_SUMMARY_INTERVAL !== 0) return false;
  if (count <= AI_CONTEXT_MESSAGE_WINDOW) return false;

  const older = await listMessagesBeforeWindow(
    conversationId,
    AI_CONTEXT_MESSAGE_WINDOW,
  );
  if (older.length === 0) return false;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { summary: true },
  });

  // Truncate each older message individually so a single huge paste can't
  // dominate the summarization prompt and blow the free-tier token budget.
  const transcript = older
    .map((m) => `${m.role}: ${truncate(m.content, AI_MAX_MESSAGE_CHARS)}`)
    .join("\n\n");

  const priorSummary = conversation?.summary
    ? `Previous summary:\n${truncate(conversation.summary, AI_MAX_MESSAGE_CHARS)}\n\n`
    : "";

  try {
    const summary = await generateText({
      instructions: SUMMARY_INSTRUCTIONS,
      input: [
        {
          role: "user",
          content: `${priorSummary}Earlier conversation to fold in:\n\n${transcript}`,
        },
      ],
      maxTokens: AI_SUMMARY_MAX_OUTPUT_TOKENS,
    });
    if (!summary.trim()) return false;

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { summary: summary.trim() },
    });
    return true;
  } catch (err) {
    console.error(
      `[memory] summary refresh failed for ${conversationId}:`,
      err,
    );
    return false;
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}
