import { z } from "zod";
import { withHandler } from "@/lib/api/handler";
import { requireMembership } from "@/lib/auth/authz";
import { findWorkspaceById } from "@/features/workspace/server/workspace.repository";
import { toWorkspaceDTO } from "@/lib/db/mappers";
import { Errors } from "@/lib/api/errors";

const paramsSchema = z.object({ workspaceId: z.string().min(1) });

/**
 * GET /api/workspaces/:workspaceId/members
 *
 * Lists members (members only). Membership creation lives behind the invite
 * token flow at /invite/[token] — there is no public "join by workspace ID"
 * endpoint, by design.
 */
export const GET = withHandler({ paramsSchema }, async ({ user, params }) => {
  await requireMembership(user.id, params.workspaceId);
  const workspace = await findWorkspaceById(params.workspaceId);
  if (!workspace) throw Errors.notFound("Workspace");
  return { members: toWorkspaceDTO(workspace).members };
});
