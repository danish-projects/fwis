import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function ConsolidateAttendanceLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="flex items-center justify-center gap-3 rounded-lg border py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
        <span className="text-sm font-medium">Loading attendance data…</span>
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
