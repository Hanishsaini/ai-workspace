import "server-only";
import type { MessageRole, MessageStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/** Data access for conversation messages + AI runs. */

export function findMessageByClientId(
  conversationId: string,
  clientMsgId: string,
) {
  return prisma.message.findUnique({
    where: { conversationId_clientMsgId: { conversationId, clientMsgId } },
  });
}

export function createMessage(input: {
  conversationId: string;
  role: MessageRole;
  authorId: string | null;
  content: string;
  status: MessageStatus;
  serverSeq: number;
  clientMsgId?: string | null;
}) {
  return prisma.message.create({ data: input });
}

/**
 * Incremental flush of an in-flight assistant message. Keeps status
 * STREAMING — this is the interrupt-safety checkpoint, not the completion.
 */
export function updateStreamingContent(messageId: string, content: string) {
  return prisma.message.update({
    where: { id: messageId },
    data: { content },
  });
}

export function completeMessage(
  messageId: string,
  content: string,
  tokenUsage?: unknown,
) {
  return prisma.message.update({
    where: { id: messageId },
    data: {
      content,
      status: "COMPLETE",
      completedAt: new Date(),
      tokenUsage: tokenUsage as object | undefined,
    },
  });
}

/** COMPLETE-message count — drives the rolling-summary refresh cadence. */
export function countCompleteMessages(conversationId: string) {
  return prisma.message.count({
    where: { conversationId, status: "COMPLETE" },
  });
}

/** All COMPLETE messages older than the most recent `window`, oldest-first. */
export function listMessagesBeforeWindow(
  conversationId: string,
  window: number,
) {
  return prisma.message
    .findMany({
      where: { conversationId, status: "COMPLETE" },
      orderBy: { serverSeq: "desc" },
      skip: window,
    })
    .then((rows) => rows.reverse());
}

/**
 * Marks a message ERROR. `partialContent` (the buffer captured before the
 * failure) is persisted when provided — an interrupted run keeps whatever
 * tokens it produced rather than discarding them.
 */
export function failMessage(messageId: string, partialContent?: string) {
  return prisma.message.update({
    where: { id: messageId },
    data: {
      status: "ERROR",
      completedAt: new Date(),
      ...(partialContent !== undefined ? { content: partialContent } : {}),
    },
  });
}

export function listMessagesSince(conversationId: string, sinceSeq: number) {
  return prisma.message.findMany({
    where: { conversationId, serverSeq: { gt: sinceSeq } },
    orderBy: { serverSeq: "asc" },
  });
}

export function listRecentMessages(conversationId: string, take: number) {
  return prisma.message
    .findMany({
      where: { conversationId, status: "COMPLETE" },
      orderBy: { serverSeq: "desc" },
      take,
    })
    .then((rows) => rows.reverse());
}

export function createAiRun(input: {
  conversationId: string;
  messageId: string;
  model: string;
}) {
  return prisma.aiRun.create({ data: input });
}

export function completeAiRun(messageId: string) {
  return prisma.aiRun.update({
    where: { messageId },
    data: { status: "COMPLETE", completedAt: new Date() },
  });
}

export function failAiRun(messageId: string, error: string) {
  return prisma.aiRun.update({
    where: { messageId },
    data: { status: "ERROR", error, completedAt: new Date() },
  });
}
