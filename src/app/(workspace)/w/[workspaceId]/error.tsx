"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[workspace] render error:", error);
  }, [error]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-lg font-semibold">Could not load this workspace</h2>
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        You may not have access, or it no longer exists.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
        <Button asChild>
          <a href="/">Go home</a>
        </Button>
      </div>
    </div>
  );
}
