import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Inbox } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { acceptInvite } from "@/features/workspace/server/invite.service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Invite acceptance entry. Server-side flow:
 *
 *   1. Unauthenticated → bounce to /login?callbackUrl=/invite/[token]
 *      so NextAuth returns the user here after sign-in.
 *   2. Authenticated → call `acceptInvite` and switch on the tagged outcome:
 *        joined / already_member → redirect into /w/[workspaceId]
 *        expired / used / invalid → render an explanatory card below
 *
 * No client component is needed for the happy path — the user never sees
 * this page render on success; they go straight to the workspace. The card
 * below only shows for terminal error states.
 */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const outcome = await acceptInvite(token, user.id);

  if (outcome.kind === "joined") {
    redirect(
      `/w/${outcome.workspaceId}?joined=${encodeURIComponent(outcome.workspaceName)}`,
    );
  }

  if (outcome.kind === "already_member") {
    redirect(`/w/${outcome.workspaceId}`);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <InviteErrorCard outcome={outcome} />
    </main>
  );
}

function InviteErrorCard({
  outcome,
}: {
  outcome:
    | { kind: "expired"; workspaceName: string }
    | { kind: "used"; workspaceName: string }
    | { kind: "invalid" };
}) {
  const copy = errorCopy(outcome);
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          {outcome.kind === "invalid" ? (
            <AlertCircle className="h-5 w-5" />
          ) : (
            <Inbox className="h-5 w-5" />
          )}
        </div>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.body}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full">
          <Link href="/dashboard">Go to your workspaces</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function errorCopy(
  outcome:
    | { kind: "expired"; workspaceName: string }
    | { kind: "used"; workspaceName: string }
    | { kind: "invalid" },
): { title: string; body: string } {
  switch (outcome.kind) {
    case "expired":
      return {
        title: "This invite has expired",
        body: `The link for "${outcome.workspaceName}" is no longer valid. Ask whoever shared it to generate a new one.`,
      };
    case "used":
      return {
        title: "This invite has already been used",
        body: `The link for "${outcome.workspaceName}" is single-use. Ask whoever shared it to generate a new one.`,
      };
    case "invalid":
      return {
        title: "Invite not found",
        body: "This link is invalid or the workspace has been deleted. Double-check the URL.",
      };
  }
}
