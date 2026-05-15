import { z } from "zod";
import { withHandler } from "@/lib/api/handler";
import { listWorkspacesForUser } from "@/features/workspace/server/workspace.repository";
import { createWorkspace } from "@/features/workspace/server/workspace.service";
import { toWorkspaceDTO } from "@/lib/db/mappers";

/** GET /api/workspaces — workspaces the current user belongs to. */
export const GET = withHandler({}, async ({ user }) => {
  const rows = await listWorkspacesForUser(user.id);
  return { workspaces: rows.map(toWorkspaceDTO) };
});

const createSchema = z.object({ name: z.string().min(1).max(80) });

/** POST /api/workspaces — create a workspace (caller becomes OWNER). */
export const POST = withHandler(
  { bodySchema: createSchema },
  async ({ user, body }) => {
    const workspace = await createWorkspace(body.name, user.id);
    return { workspace };
  },
);
