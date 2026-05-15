import { z } from "zod";
import { withHandler } from "@/lib/api/handler";
import { requireMembership } from "@/lib/auth/authz";
import { signRealtimeToken } from "@/lib/realtime/token";

const bodySchema = z.object({ workspaceId: z.string().min(1) });

/**
 * POST /api/realtime/token
 * Mints a short-lived JWT scoped to one workspace. The client passes it in
 * the socket handshake; the socket server verifies it with the shared
 * secret. Membership is checked here so the socket server never has to.
 */
export const POST = withHandler({ bodySchema }, async ({ user, body }) => {
  const member = await requireMembership(user.id, body.workspaceId);
  const token = await signRealtimeToken({
    userId: user.id,
    workspaceId: body.workspaceId,
    name: user.name,
    avatarUrl: user.avatarUrl,
    cursorColor: member.cursorColor,
  });
  return { token };
});
