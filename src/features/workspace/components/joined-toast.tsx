"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/**
 * Fires a welcome toast when the workspace is opened via an invite redirect
 * (`/w/[id]?joined=<workspaceName>`) and strips the query param so a refresh
 * doesn't replay it. Mounts once at the top of WorkspaceShell.
 */
export function JoinedToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const joined = params.get("joined");
    if (!joined) return;
    toast.success(`Joined ${joined}`);
    router.replace(pathname, { scroll: false });
  }, [params, pathname, router]);

  return null;
}
