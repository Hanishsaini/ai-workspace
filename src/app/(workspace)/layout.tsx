import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Authenticated shell. Server component — the session gate runs before any
 * workspace UI renders. Per-workspace chrome lives in the page itself since
 * it needs the resolved workspaceId.
 */
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <div className="min-h-screen bg-background">{children}</div>;
}
