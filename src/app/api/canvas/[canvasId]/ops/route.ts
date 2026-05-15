import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/api/handler";
import { resolveServiceCaller } from "@/lib/api/service-auth";
import { getCurrentUser } from "@/lib/auth/session";
import { requireCanvasAccess } from "@/lib/auth/authz";
import { Errors } from "@/lib/api/errors";
import { applyCanvasOp } from "@/features/canvas/server/canvas.service";
import type { CanvasOp } from "@workspace/shared";

const bodySchema = z.object({
  op: z.object({
    opId: z.string().min(1),
    type: z.enum(["insert", "update", "delete"]),
    payload: z.unknown(),
  }),
});

/**
 * POST /api/canvas/:canvasId/ops
 * Accepts a client-proposed canvas op, assigns the authoritative serverSeq,
 * persists it, folds the snapshot, and broadcasts canvas:op:applied over
 * Redis. Called by the socket server (SERVICE_TOKEN) or a browser directly.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ canvasId: string }> },
) {
  try {
    const serviceUserId = resolveServiceCaller(req);
    const userId = serviceUserId ?? (await getCurrentUser())?.id ?? null;
    if (!userId) throw Errors.unauthorized();

    const { canvasId } = await ctx.params;
    await requireCanvasAccess(userId, canvasId, "EDITOR");

    const body = bodySchema.parse(await req.json());
    const applied = await applyCanvasOp(canvasId, userId, body.op as CanvasOp);

    return NextResponse.json({ applied });
  } catch (err) {
    return toErrorResponse(err);
  }
}
