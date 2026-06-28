import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function GradeChangeLoadingBanner() {
  return (
    <div
      className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
      Loading grade data…
    </div>
  );
}

export function ClassroomEntryLoading() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-10 w-44" />
      </div>
      <div className="flex items-center justify-center gap-3 rounded-lg border py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
        <span className="text-sm font-medium">Loading grade data…</span>
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  );
}

export function ClassroomContentLoadingOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-[1px]">
      <div className="flex flex-col items-center gap-2 text-primary">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        <span className="text-sm font-medium">Loading…</span>
      </div>
    </div>
  );
}
