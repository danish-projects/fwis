import Link from "next/link";
import { Download, Plus, Search } from "lucide-react";
import { getStudents } from "@/actions/students";
import { getSessionUser, requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getSelectedSchool } from "@/lib/school/resolve-school";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Students" };

type PageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    gender?: string;
    isActive?: string;
    sort?: string;
    order?: string;
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

export default async function StudentsPage({ searchParams }: PageProps) {
  await requirePermission("students:read");
  const user = await getSessionUser();
  const canCreate = user && hasPermission(user.roles, "students:create");
  const canExport = user && hasPermission(user.roles, "reports:export");
  const selectedSchool = user ? await getSelectedSchool(user) : null;

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const gender = params.gender as "MALE" | "FEMALE" | undefined;
  const isActive =
    params.isActive === "true"
      ? true
      : params.isActive === "false"
        ? false
        : undefined;
  const sort = (params.sort as "lastName" | "firstName" | "enrollmentDate") || "lastName";
  const order = (params.order as "asc" | "desc") || "asc";

  const { data: students, meta } = await getStudents({
    page,
    search: params.search,
    gender,
    isActive,
    sort,
    order,
  });

  const queryBase = {
    search: params.search,
    gender: params.gender,
    isActive: params.isActive,
    sort,
    order,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Students</h1>
          <p className="text-muted-foreground">
            Global student master data — students are never duplicated
            {selectedSchool ? ` · ${selectedSchool.name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canExport && (
            <Button asChild variant="outline">
              <a
                href={`/api/export/students${buildQuery(queryBase)}`}
                download
              >
                <Download className="h-4 w-4" />
                Export CSV
              </a>
            </Button>
          )}
          {canCreate && (
            <Button asChild>
              <Link href="/students/new">
                <Plus className="h-4 w-4" />
                Add Student
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <form className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="search"
                placeholder="Search name or student ID..."
                defaultValue={params.search}
                className="pl-9"
              />
            </div>
            <select
              name="gender"
              defaultValue={params.gender ?? ""}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All genders</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
            <select
              name="isActive"
              defaultValue={params.isActive ?? ""}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <select
              name="sort"
              defaultValue={sort}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="lastName">Sort: Last Name</option>
              <option value="firstName">Sort: First Name</option>
              <option value="enrollmentDate">Sort: Enrollment Date</option>
            </select>
            <Button type="submit" variant="secondary">
              Filter
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Student</th>
                  <th className="pb-3 pr-4 font-medium">Gender</th>
                  <th className="pb-3 pr-4 font-medium">Guardian</th>
                  <th className="pb-3 pr-4 font-medium">Current School</th>
                  <th className="pb-3 pr-4 font-medium">Grade</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const enrollment = student.enrollments[0];
                  return (
                    <tr key={student.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/students/${student.id}`}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {student.firstName} {student.lastName}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          DOB: {formatDate(student.dateOfBirth)}
                        </p>
                      </td>
                      <td className="py-3 pr-4 capitalize">
                        {student.gender.toLowerCase()}
                      </td>
                      <td className="py-3 pr-4">
                        <p>
                          {[
                            student.fatherGuardianFirstName,
                            student.fatherGuardianLastName,
                          ]
                            .filter(Boolean)
                            .join(" ") ||
                            [
                              student.motherGuardianFirstName,
                              student.motherGuardianLastName,
                            ]
                              .filter(Boolean)
                              .join(" ") ||
                            "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {student.fatherMobileWhatsappNumber ||
                            student.motherMobileWhatsappNumber ||
                            ""}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {enrollment?.school.name ?? "—"}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {enrollment?.classroom.name ?? "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={student.isActive ? "success" : "secondary"}>
                          {student.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/students/${student.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No students found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {meta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {meta.page} of {meta.totalPages} ({meta.total} total)
              </span>
              <div className="flex gap-2">
                {meta.page > 1 && (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/students${buildQuery(queryBase, { page: String(meta.page - 1) })}`}
                    >
                      Previous
                    </Link>
                  </Button>
                )}
                {meta.page < meta.totalPages && (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/students${buildQuery(queryBase, { page: String(meta.page + 1) })}`}
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
