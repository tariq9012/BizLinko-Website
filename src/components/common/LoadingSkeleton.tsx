import { cn } from "@/lib/utils";

export function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function JobCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex gap-4">
        <LoadingSkeleton className="size-12 rounded-xl" />
        <div className="flex-1 space-y-3">
          <LoadingSkeleton className="h-4 w-2/3" />
          <LoadingSkeleton className="h-3 w-1/3" />
          <div className="flex gap-2">
            <LoadingSkeleton className="h-6 w-20" />
            <LoadingSkeleton className="h-6 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}
