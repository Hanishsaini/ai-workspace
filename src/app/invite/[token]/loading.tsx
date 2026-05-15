import { Loader2 } from "lucide-react";

/**
 * Shown while the server component resolves the token + adds the membership.
 * Most users will only see this for a few hundred milliseconds before the
 * redirect into the workspace fires.
 */
export default function InviteLoading() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Joining workspace…</p>
      </div>
    </main>
  );
}
