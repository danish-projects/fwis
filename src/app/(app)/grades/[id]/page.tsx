import Link from "next/link";
import { notFound } from "next/navigation";
import { getGradeRecordById } from "@/actions/grades";
import { requirePermission } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Grade" };

type PageProps = { params: Promise<{ id: string }> };

export default async function GradeDetailPage({ params }: PageProps) {
  await requirePermission("classrooms:read");
  const { id } = await params;
  const grade = await getGradeRecordById(id);
  if (!grade) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href="/grades">← Back to grades</Link>
          </Button>
          <h1 className="text-2xl font-bold md:text-3xl">{grade.name}</h1>
          <p className="text-muted-foreground">{grade.school.name}</p>
        </div>
        <Button asChild>
          <Link href={`/grades/${grade.id}/edit`}>Edit</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Grade Level</p>
            <p className="font-medium">{grade.grade.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Section</p>
            <p className="font-medium">{grade.section.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Students (selected year)</p>
            <p className="font-medium">{grade.enrollmentCount}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={grade.isActive ? "success" : "secondary"} className="mt-1">
              {grade.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Teachers</CardTitle>
        </CardHeader>
        <CardContent>
          {grade.teachers.length === 0 ? (
            <p className="text-muted-foreground">No teachers assigned.</p>
          ) : (
            <ul className="space-y-2">
              {grade.teachers.map(({ teacher }) => (
                <li key={teacher.id} className="text-sm">
                  <Link href={`/teachers/${teacher.id}`} className="hover:underline">
                    {teacher.firstName} {teacher.lastName}
                  </Link>
                  <span className="text-muted-foreground"> · {teacher.email}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/attendance/${grade.id}`}>Take Attendance</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/assessments/${grade.id}`}>Enter Assessments</Link>
        </Button>
      </div>
    </div>
  );
}
