import Link from "next/link";
import { getClassroomsForAssessment } from "@/actions/enrollments";
import { requirePermission } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Transcript" };

export default async function TranscriptPage() {
  await requirePermission("assessments:read");
  const classrooms = await getClassroomsForAssessment();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Transcript</h1>
        <p className="text-muted-foreground">
          View attendance, behavior, quiz scores, and final grades (read-only)
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classrooms.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle className="text-lg">{c.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{c.school.name}</p>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {c._count.enrollments} students
              </span>
              <Button asChild size="sm" variant="outline">
                <Link href={`/transcript/${c.id}`}>View Transcript</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        {classrooms.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="py-8 text-center text-muted-foreground">
              No grades available for your role.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
