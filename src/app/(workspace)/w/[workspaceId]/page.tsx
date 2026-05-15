import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { requireMembership } from "@/lib/auth/authz";
import { getWorkspaceSnapshot } from "@/features/workspace/server/workspace.service";
import { WorkspaceShell } from "@/features/workspace/components/workspace-shell";
import { ApiError } from "@/lib/api/errors";

/**
 * Workspace entry (RSC). Auth + membership gate, then build the snapshot the
 * client store hydrates from. Everything realtime lives inside the client
 * `WorkspaceShell` below this boundary.
 */
export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  try {
    await requireMembership(user.id, workspaceId);
    const snapshot = await getWorkspaceSnapshot(workspaceId);
    return <WorkspaceShell snapshot={snapshot} />;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    // 403 / anything else → bubble to error.tsx
    throw err;
  }
}
