import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { AccountMenu } from "@/features/account/components/account-menu";
import { APP_NAME } from "@/config/constants";

/**
 * Authenticated dashboard shell. Middleware already gates this route, but
 * we double-check here so a session that expires between request and render
 * doesn't leak an empty UI.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-card/40 px-4 backdrop-blur sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">{APP_NAME}</span>
        </Link>
        <AccountMenu />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
