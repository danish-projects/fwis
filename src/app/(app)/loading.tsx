import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading page">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
        <span className="text-sm font-medium">Loading page…</span>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
