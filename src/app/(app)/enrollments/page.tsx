import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { getEnrollments, getEnrollmentFormOptions } from "@/actions/enrollments";
import { getSessionUser, requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getSelectedSchool } from "@/lib/school/resolve-school";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate, formatPercent } from "@/lib/utils";

export const metadata = { title: "Enrollments" };

type PageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    classroomId?: string;
  }>;
};

function buildQuery(
  params: Record<string, string | undefined>,
  overrides: Record<string, string | undefined> = {}
) {
  const merged = { ...params, ...overrides };
  const qs = new URLSearchParams();
  Object.entries(merged).forEach(([k, v]) => {
    if (v) qs.set(k, v);
  });
  const str = qs.toString();
  return str ? `?${str}` : "";
}

export default async function EnrollmentsPage({ searchParams }: PageProps) {
  await requirePermission("enrollments:read");
  const user = await getSessionUser();
  const canCreate = user && hasPermission(user.roles, "enrollments:create");
  const selectedSchool = user ? await getSelectedSchool(user) : null;

  const params = await searchParams;
  const page = Number(params.page) || 1;

  const [{ data: enrollments, meta }, { classrooms }] = await Promise.all([
    getEnrollments({
      page,
      search: params.search,
      status: params.status,
      classroomId: params.classroomId,
    }),
    getEnrollmentFormOptions(),
  ]);

  const queryBase = {
    search: params.search,
    status: params.status,
    classroomId: params.classroomId,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Enrollments</h1>
          <p className="text-muted-foreground">
            Link students to schools, years, and grades
            {selectedSchool ? ` · ${selectedSchool.name}` : ""}
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/enrollments/new">
              <Plus className="h-4 w-4" />
              New Enrollment
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <form className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="search"
                placeholder="Search student name..."
                defaultValue={params.search}
                className="pl-9"
              />
            </div>
            <select
              name="classroomId"
              defaultValue={params.classroomId ?? ""}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All grades</option>
              {classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={params.status ?? ""}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="WITHDRAWN">Withdrawn</option>
              <option value="GRADUATED">Graduated</option>
              <option value="PROMOTED">Promoted</option>
            </select>
            <Button type="submit" variant="secondary">
              Filter
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Student</th>
                  <th className="pb-3 pr-4 font-medium">School / Year</th>
                  <th className="pb-3 pr-4 font-medium">Classroom</th>
                  <th className="pb-3 pr-4 font-medium">Staff</th>
                  <th className="pb-3 pr-4 font-medium">Final Grade</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/enrollments/${e.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {e.student.firstName} {e.student.lastName}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      <p>{e.school.name}</p>
                      <p className="text-xs">{e.academicYearSchool.academicYear.name}</p>
                    </td>
                    <td className="py-3 pr-4">{e.classroom.name}</td>
                    <td className="py-3 pr-4">
                      {e.staff
                        ? `${e.staff.firstName} ${e.staff.lastName}`
                        : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      {e.finalGrade ? (
                        <span>
                          {formatPercent(Number(e.finalGrade.finalPct))}{" "}
                          <Badge variant="outline">{e.finalGrade.letterGrade}</Badge>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={e.status === "ACTIVE" ? "success" : "secondary"}>
                        {e.status}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/enrollments/${e.id}`}>View</Link>
                        </Button>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/students/${e.studentId}/profile?year=${e.academicYearSchool.academicYear.id}`}>
                            Profile
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {enrollments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      {selectedSchool
                        ? "No enrollments found for this school."
                        : "Select a school to view enrollments."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {meta.totalPages > 1 && (
            <div className="mt-4 flex justify-between text-sm text-muted-foreground">
              <span>
                Page {meta.page} of {meta.totalPages}
              </span>
              <div className="flex gap-2">
                {meta.page > 1 && (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/enrollments${buildQuery(queryBase, { page: String(meta.page - 1) })}`}
                    >
                      Previous
                    </Link>
                  </Button>
                )}
                {meta.page < meta.totalPages && (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/enrollments${buildQuery(queryBase, { page: String(meta.page + 1) })}`}
                    >
                      Next
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
