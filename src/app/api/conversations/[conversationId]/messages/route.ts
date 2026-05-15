import { z } from "zod";
import { withHandler } from "@/lib/api/handler";
import { requireConversationAccess } from "@/lib/auth/authz";
import { prisma } from "@/lib/db/prisma";
import { toMessageDTO } from "@/lib/db/mappers";

const paramsSchema = z.object({ conversationId: z.string().min(1) });

/**
 * GET /api/conversations/:conversationId/messages?before=<serverSeq>&limit=
 * Paginated history. Realtime push handles the live tail; this is the pull
 * path for scrollback (TanStack Query territory).
 */
export const GET = withHandler(
  { paramsSchema },
  async ({ req, user, params }) => {
    await requireConversationAccess(user.id, params.conversationId);

    const url = new URL(req.url);
    const before = Number(url.searchParams.get("before") ?? "0");
    const limit = Math.min(
      Number(url.searchParams.get("limit") ?? "30"),
      100,
    );

    const messages = await prisma.message.findMany({
      where: {
        conversationId: params.conversationId,
        ...(before > 0 ? { serverSeq: { lt: before } } : {}),
      },
      orderBy: { serverSeq: "desc" },
      take: limit,
    });
    messages.reverse();

    return {
      messages: messages.map(toMessageDTO),
      hasMore: messages.length === limit,
    };
  },
);
