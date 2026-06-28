import { Mars, Venus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StudentsStatCardProps = {
  label?: string;
  total: number;
  boys: number;
  girls: number;
};

export function StudentsStatCard({
  label = "Total Students",
  total,
  boys,
  girls,
}: StudentsStatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-3xl font-bold">{total}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-sky-600 dark:text-sky-400">
            <Mars className="size-4 shrink-0" aria-hidden />
            {boys}
            <span className="sr-only">Boys</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-pink-600 dark:text-pink-400">
            <Venus className="size-4 shrink-0" aria-hidden />
            {girls}
            <span className="sr-only">Girls</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
