import { Mars, Venus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type StudentsByGradeRow = {
  grade: string;
  sortOrder: number;
  total: number;
  boys: number;
  girls: number;
};

type StudentsByGradeCardProps = {
  rows: StudentsByGradeRow[];
};

export function StudentsByGradeCard({ rows }: StudentsByGradeCardProps) {
  const sorted = [...rows].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Students by Grade</CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-muted-foreground">No enrollment data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-2 pr-4 text-left font-medium">Grade</th>
                  <th className="pb-2 px-2 text-right font-medium">
                    <span className="inline-flex items-center justify-end gap-1 text-sky-600 dark:text-sky-400">
                      <Mars className="size-4 shrink-0" aria-hidden />
                      Boys
                    </span>
                  </th>
                  <th className="pb-2 pl-2 text-right font-medium">
                    <span className="inline-flex items-center justify-end gap-1 text-pink-600 dark:text-pink-400">
                      <Venus className="size-4 shrink-0" aria-hidden />
                      Girls
                    </span>
                  </th>
                  <th className="pb-2 pl-4 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr key={row.grade} className="border-b last:border-0">
                    <td className="py-2 pr-4">{row.grade}</td>
                    <td className="py-2 px-2 text-right font-medium text-sky-600 dark:text-sky-400">
                      {row.boys}
                    </td>
                    <td className="py-2 pl-2 text-right font-medium text-pink-600 dark:text-pink-400">
                      {row.girls}
                    </td>
                    <td className="py-2 pl-4 text-right font-medium">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
