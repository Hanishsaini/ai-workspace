import { Skeleton } from "@/components/ui/skeleton";

export default function WorkspaceLoading() {
  return (
    <div className="flex h-screen flex-col">
      <div className="flex h-14 items-center justify-between border-b px-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="grid flex-1 grid-cols-[1fr_420px]">
        <div className="space-y-4 p-6">
          <Skeleton className="h-20 w-3/4" />
          <Skeleton className="h-20 w-2/3" />
          <Skeleton className="h-20 w-3/5" />
        </div>
        <div className="border-l p-6">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
