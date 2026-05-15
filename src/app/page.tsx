import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Entry point. Authenticated users land on the dashboard (which lists
 * their workspaces — no auto-restore into the most-recent one); everyone
 * else goes to /login. Removing the "find any membership and redirect" path
 * is what fixes the "old chat keeps reopening after reload" behavior.
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect("/dashboard");
}
