import { z } from "zod";
import { withHandler } from "@/lib/api/handler";
import { createInvite } from "@/features/workspace/server/invite.service";

const paramsSchema = z.object({ workspaceId: z.string().min(1) });

/**
 * POST /api/workspaces/:workspaceId/invites
 *
 * Mints a single-use invite token + the absolute URL the inviter copies to
 * their clipboard. Authorization (must be EDITOR+) lives in the service so
 * the same rule applies to every future caller.
 *
 * The absolute URL is built from the request origin so the link works whether
 * we're on localhost, a preview deploy, or production — without leaking the
 * NEXTAUTH_URL env var across realms.
 */
export const POST = withHandler({ paramsSchema }, async ({ req, user, params }) => {
  const origin = new URL(req.url).origin;
  const invite = await createInvite(params.workspaceId, user.id, origin);
  return { invite };
});
