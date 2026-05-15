import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/api/handler";
import { resolveServiceCaller } from "@/lib/api/service-auth";
import { getCurrentUser } from "@/lib/auth/session";
import { requireConversationAccess } from "@/lib/auth/authz";
import { Errors } from "@/lib/api/errors";
import { runAiTurn } from "@/features/ai/server/ai-orchestrator";

const bodySchema = z.object({
  clientMsgId: z.string().min(1),
  conversationId: z.string().min(1),
  workspaceId: z.string().min(1),
  text: z.string().min(1).max(8000),
});

/**
 * POST /api/ai/stream
 * The AI orchestration entrypoint. Called by the socket server on a user's
 * behalf (SERVICE_TOKEN) or directly by a browser (NextAuth session).
 *
 * Returns immediately with { runId } once the user message + run are
 * committed — the actual token stream is fanned out over Redis, NOT this
 * HTTP response, so both members get one identical stream.
 */
export async function POST(req: NextRequest) {
  try {
    const serviceUserId = resolveServiceCaller(req);
    const userId =
      serviceUserId ?? (await getCurrentUser())?.id ?? null;
    if (!userId) throw Errors.unauthorized();

    const body = bodySchema.parse(await req.json());
    await requireConversationAccess(userId, body.conversationId, "EDITOR");

    const result = await runAiTurn({
      workspaceId: body.workspaceId,
      conversationId: body.conversationId,
      userId,
      clientMsgId: body.clientMsgId,
      text: body.text,
    });

    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
