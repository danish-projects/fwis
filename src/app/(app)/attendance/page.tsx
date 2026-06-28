import Link from "next/link";
import { getClassroomsForAttendance } from "@/actions/attendance";
import { requirePermission } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Attendance" };

export default async function AttendancePage() {
  await requirePermission("attendance:read");
  const classrooms = await getClassroomsForAttendance();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Attendance</h1>
          <p className="text-muted-foreground">
            Mark Sunday attendance by grade or review an entire grade level
          </p>
        </div>
        <Button asChild>
          <Link href="/attendance/summary">Grade summary view</Link>
        </Button>
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
              <Button asChild size="sm">
                <Link href={`/attendance/${c.id}`}>Take Attendance</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
