import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeacherById } from "@/actions/teachers";
import { requirePermission } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Teacher" };

type PageProps = { params: Promise<{ id: string }> };

export default async function TeacherDetailPage({ params }: PageProps) {
  await requirePermission("teachers:read");
  const { id } = await params;
  const teacher = await getTeacherById(id);
  if (!teacher) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href="/teachers">← Back to teachers</Link>
          </Button>
          <h1 className="text-2xl font-bold md:text-3xl">
            {teacher.firstName} {teacher.lastName}
          </h1>
          <p className="text-muted-foreground">{teacher.school.name}</p>
        </div>
        <Button asChild>
          <Link href={`/teachers/${teacher.id}/edit`}>Edit</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Gender</p>
            <p className="font-medium capitalize">{teacher.genderRef.label.toLowerCase()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{teacher.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="font-medium">{teacher.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={teacher.isActive ? "success" : "secondary"} className="mt-1">
              {teacher.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Active Students</p>
            <p className="font-medium">{teacher._count.enrollments}</p>
          </div>
          {teacher.user && (
            <div className="sm:col-span-2">
              <p className="text-sm text-muted-foreground">Linked App User</p>
              <p className="font-medium">
                {teacher.user.fullName ?? teacher.user.email}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Grades</CardTitle>
        </CardHeader>
        <CardContent>
          {teacher.classrooms.length === 0 ? (
            <p className="text-muted-foreground">No grades assigned.</p>
          ) : (
            <ul className="space-y-2">
              {teacher.classrooms.map(({ classroom }) => (
                <li key={classroom.id} className="text-sm">
                  {classroom.name}
                  <span className="text-muted-foreground">
                    {" "}
                    · {classroom.grade.name} {classroom.section.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
