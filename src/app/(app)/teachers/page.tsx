import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { getTeacherFormOptions, getTeachers } from "@/actions/teachers";
import { getSessionUser, requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata = { title: "Teachers" };

type PageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    schoolId?: string;
    gender?: string;
    isActive?: string;
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

export default async function TeachersPage({ searchParams }: PageProps) {
  await requirePermission("teachers:read");
  const user = await getSessionUser();
  const canCreate = user && hasPermission(user.roles, "teachers:create");

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const gender = params.gender as "MALE" | "FEMALE" | undefined;
  const isActive =
    params.isActive === "true"
      ? true
      : params.isActive === "false"
        ? false
        : undefined;

  const [{ data: teachers, meta }, { schools }] = await Promise.all([
    getTeachers({
      page,
      search: params.search,
      schoolId: params.schoolId,
      gender,
      isActive,
    }),
    getTeacherFormOptions(),
  ]);

  const queryBase = {
    search: params.search,
    schoolId: params.schoolId,
    gender: params.gender,
    isActive: params.isActive,
  };

  const showSchoolFilter = schools.length > 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Teachers</h1>
          <p className="text-muted-foreground">
            Manage teachers and grade assignments
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/teachers/new">
              <Plus className="h-4 w-4" />
              Add Teacher
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <form className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="search"
                placeholder="Search name or email..."
                defaultValue={params.search}
                className="pl-9"
              />
            </div>
            {showSchoolFilter && (
              <select
                name="schoolId"
                defaultValue={params.schoolId ?? ""}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All schools</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            <select
              name="gender"
              defaultValue={gender ?? ""}
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
            <Button type="submit" variant="secondary">
              Apply
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Teacher</th>
                  <th className="pb-3 pr-4 font-medium">Gender</th>
                  <th className="pb-3 pr-4 font-medium">School</th>
                  <th className="pb-3 pr-4 font-medium">Email</th>
                  <th className="pb-3 pr-4 font-medium">Grades</th>
                  <th className="pb-3 pr-4 font-medium">Students</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/teachers/${teacher.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {teacher.firstName} {teacher.lastName}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 capitalize text-muted-foreground">
                      {teacher.genderRef.label.toLowerCase()}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {teacher.school.name}
                    </td>
                    <td className="py-3 pr-4">{teacher.email}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {teacher.classrooms.length > 0
                        ? teacher.classrooms
                            .map((c) => c.classroom.name)
                            .join(", ")
                        : "—"}
                    </td>
                    <td className="py-3 pr-4">{teacher._count.enrollments}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={teacher.isActive ? "success" : "secondary"}>
                        {teacher.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/teachers/${teacher.id}/edit`}>Edit</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {teachers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      No teachers found.
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
                    <Link href={`/teachers${buildQuery(queryBase, { page: String(meta.page - 1) })}`}>
                      Previous
                    </Link>
                  </Button>
                )}
                {meta.page < meta.totalPages && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/teachers${buildQuery(queryBase, { page: String(meta.page + 1) })}`}>
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
