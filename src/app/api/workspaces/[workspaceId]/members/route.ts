import { z } from "zod";
import { withHandler } from "@/lib/api/handler";
import { requireMembership } from "@/lib/auth/authz";
import { addMember } from "@/features/workspace/server/workspace.service";
import { findWorkspaceById } from "@/features/workspace/server/workspace.repository";
import { toMemberDTO, toWorkspaceDTO } from "@/lib/db/mappers";
import { Errors } from "@/lib/api/errors";

const paramsSchema = z.object({ workspaceId: z.string().min(1) });

/**
 * POST /api/workspaces/:workspaceId/members
 * Adds the current user to a workspace (invite-by-link MVP flow — any
 * authenticated user with the link joins as EDITOR).
 */
export const POST = withHandler({ paramsSchema }, async ({ user, params }) => {
  const member = await addMember(params.workspaceId, user.id);
  return { member: toMemberDTO(member) };
});

/** GET — list members (members only). */
export const GET = withHandler({ paramsSchema }, async ({ user, params }) => {
  await requireMembership(user.id, params.workspaceId);
  const workspace = await findWorkspaceById(params.workspaceId);
  if (!workspace) throw Errors.notFound("Workspace");
  return { members: toWorkspaceDTO(workspace).members };
});
