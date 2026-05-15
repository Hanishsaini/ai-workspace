import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getServerEnv } from "@/config/env";
import { LoginForm } from "@/features/auth/components/login-form";

/**
 * Server entry. Resolves which providers are actually wired up + reads any
 * `?error=` from a previous attempt, then hands off to the client form.
 * Authenticated users skip the page entirely.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const env = getServerEnv();
  const params = await searchParams;

  const devLoginFlag = process.env.ENABLE_DEV_LOGIN;
  const devLoginEnabled =
    devLoginFlag === "true" ||
    (devLoginFlag !== "false" && process.env.NODE_ENV !== "production");

  return (
    <LoginForm
      providers={{
        google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
        github: Boolean(env.GITHUB_ID && env.GITHUB_SECRET),
        devLogin: devLoginEnabled,
      }}
      initialError={params.error}
      callbackUrl={params.callbackUrl}
    />
  );
}
