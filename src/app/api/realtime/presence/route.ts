import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/api/handler";
import { resolveServiceCaller } from "@/lib/api/service-auth";
import { getCurrentUser } from "@/lib/auth/session";
import { requireMembership } from "@/lib/auth/authz";
import { Errors } from "@/lib/api/errors";
import { recordPresence } from "@/features/presence/server/presence.repository";

const bodySchema = z.object({
  workspaceId: z.string().min(1),
  status: z.enum(["ONLINE", "AWAY", "OFFLINE"]),
  lastCursor: z
    .object({ x: z.number(), y: z.number() })
    .nullable()
    .optional(),
});

/**
 * POST /api/realtime/presence
 * Durable-presence beacon. The socket server has no DB access by design, so
 * it calls this on connect/disconnect transitions to persist a member's
 * status into PresenceState. Redis stays the live broadcast layer — this is
 * only the durable record ("last active", Redis-flush recovery).
 *
 * Accepts the socket server (SERVICE_TOKEN) or a browser (NextAuth session).
 */
export async function POST(req: NextRequest) {
  try {
    const serviceUserId = resolveServiceCaller(req);
    const userId = serviceUserId ?? (await getCurrentUser())?.id ?? null;
    if (!userId) throw Errors.unauthorized();

    const body = bodySchema.parse(await req.json());
    await requireMembership(userId, body.workspaceId);

    await recordPresence({
      workspaceId: body.workspaceId,
      userId,
      status: body.status,
      lastCursor: body.lastCursor ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
