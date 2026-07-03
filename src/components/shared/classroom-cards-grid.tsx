import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ClassroomCard = {
  id: string;
  name: string;
  _count: { enrollments: number };
};

type ClassroomCardsGridProps = {
  classrooms: ClassroomCard[];
  hrefPrefix: "/assessments" | "/attendance" | "/transcript";
  actionLabel: string;
  actionVariant?: "default" | "outline";
  emptyMessage?: string;
};

export function ClassroomCardsGrid({
  classrooms,
  hrefPrefix,
  actionLabel,
  actionVariant = "default",
  emptyMessage = "No grades available for the selected school.",
}: ClassroomCardsGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {classrooms.map((classroom) => (
        <Card key={classroom.id}>
          <CardHeader>
            <CardTitle className="text-lg">{classroom.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {classroom._count.enrollments} students
            </span>
            <Button asChild size="sm" variant={actionVariant}>
              <Link href={`${hrefPrefix}/${classroom.id}`}>{actionLabel}</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
      {classrooms.length === 0 && (
        <Card className="sm:col-span-2 lg:col-span-3">
          <CardContent className="py-8 text-center text-muted-foreground">
            {emptyMessage}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
