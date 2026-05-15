import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { toWorkspaceDTO } from "@/lib/db/mappers";
import { WorkspaceCard } from "@/features/workspace/components/workspace-card";
import { CreateWorkspaceDialog } from "@/features/workspace/components/create-workspace-dialog";

/**
 * Workspaces dashboard. RSC: fetches every workspace the current user
 * belongs to + their role, then renders a card grid. Replaces the old
 * "auto-redirect into the most recent workspace" behavior — users now pick
 * which workspace to enter, and a new account gets its personal workspace
 * pre-provisioned by the createUser auth event.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    orderBy: { joinedAt: "desc" },
    include: {
      workspace: { include: { members: { include: { user: true } } } },
    },
  });

  const cards = memberships.map((m) => ({
    workspace: toWorkspaceDTO(m.workspace),
    role: m.role,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="mb-8 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a workspace to jump in, or create a new one.
          </p>
        </div>
        <CreateWorkspaceDialog />
      </div>

      {cards.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c, i) => (
            <WorkspaceCard
              key={c.workspace.id}
              workspace={c.workspace}
              role={c.role}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card/40 px-6 py-16 text-center">
      <h2 className="text-base font-semibold">No workspaces yet</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        A personal workspace is normally provisioned on sign-up. If you're
        seeing this, create one to get started.
      </p>
      <div className="mt-2">
        <CreateWorkspaceDialog />
      </div>
    </div>
  );
}
