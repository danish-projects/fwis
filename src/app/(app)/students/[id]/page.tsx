import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentById } from "@/actions/students";
import { getSessionUser, requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type PageProps = { params: Promise<{ id: string }> };

export default async function StudentDetailPage({ params }: PageProps) {
  await requirePermission("students:read");
  const user = await getSessionUser();
  const canEdit = user && hasPermission(user.roles, "students:update");
  const canEnroll = user && hasPermission(user.roles, "enrollments:create");

  const { id } = await params;
  const student = await getStudentById(id);
  if (!student) notFound();

  const activeEnrollment = student.enrollments.find((e) => e.status === "ACTIVE");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">
            {student.firstName} {student.lastName}
          </h1>
          <p className="text-muted-foreground capitalize">
            {student.gender.toLowerCase()} · ID: {student.id.slice(0, 8)}…
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/students">Back</Link>
          </Button>
          {canEnroll && !activeEnrollment && (
            <Button asChild variant="secondary">
              <Link href={`/enrollments/new?studentId=${student.id}`}>Enroll Student</Link>
            </Button>
          )}
          {canEdit && (
            <Button asChild>
              <Link href={`/students/${student.id}/edit`}>Edit</Link>
            </Button>
          )}
          <Button asChild variant="secondary">
            <Link href={`/students/${student.id}/profile`}>Profile</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={student.isActive ? "success" : "secondary"}>
              {student.isActive ? "Active" : "Inactive"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{student.enrollments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Current Grade</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{activeEnrollment?.classroom.name ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Date of Birth</p>
            <p>{formatDate(student.dateOfBirth)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Enrollment Date</p>
            <p>{formatDate(student.enrollmentDate)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Parent / Guardian</p>
            <p>{student.parentName ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Parent Phone</p>
            <p>{student.parentPhone ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Parent Email</p>
            <p>{student.parentEmail ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Emergency Contact</p>
            <p>{student.emergencyContact ?? "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-sm text-muted-foreground">Address</p>
            <p>{student.address ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enrollment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Year</th>
                  <th className="pb-3 pr-4 font-medium">School</th>
                  <th className="pb-3 pr-4 font-medium">Grade</th>
                  <th className="pb-3 pr-4 font-medium">Teacher</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {student.enrollments.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">{e.academicYear.name}</td>
                    <td className="py-3 pr-4">{e.school.name}</td>
                    <td className="py-3 pr-4">{e.classroom.name}</td>
                    <td className="py-3 pr-4">
                      {e.teacher
                        ? `${e.teacher.firstName} ${e.teacher.lastName}`
                        : "—"}
                    </td>
                    <td className="py-3">
                      <Badge variant="outline">{e.status}</Badge>
                    </td>
                    <td className="py-3">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/students/${student.id}/profile?year=${e.academicYearId}`}>
                          Profile
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {student.enrollments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      No enrollments yet. Add one from the Enrollments module.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
