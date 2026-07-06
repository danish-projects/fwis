import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { getGradeRecords } from "@/actions/grades";
import { getSessionUser, requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getSelectedSchool } from "@/lib/school/resolve-school";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata = { title: "Grades" };

type PageProps = {
  searchParams: Promise<{ page?: string; search?: string }>;
};

export default async function GradesPage({ searchParams }: PageProps) {
  await requirePermission("classrooms:read");
  const user = await getSessionUser();
  const canCreate = user && hasPermission(user.roles, "classrooms:create");
  const selectedSchool = user ? await getSelectedSchool(user) : null;

  const params = await searchParams;
  const page = Number(params.page) || 1;

  const { data: grades, meta } = await getGradeRecords({
    page,
    search: params.search,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Grades</h1>
          <p className="text-muted-foreground">
            Manage grade levels (Grade 1–6 Boys and Girls) per school
            {selectedSchool ? ` · ${selectedSchool.name}` : ""}
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/grades/new">
              <Plus className="h-4 w-4" />
              Add Grade
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <form className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="search"
                placeholder="Search grades..."
                defaultValue={params.search}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Grade</th>
                  <th className="pb-3 pr-4 font-medium">School</th>
                  <th className="pb-3 pr-4 font-medium">Level</th>
                  <th className="pb-3 pr-4 font-medium">Section</th>
                  <th className="pb-3 pr-4 font-medium">Students</th>
                  <th className="pb-3 pr-4 font-medium">Teachers</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((grade) => (
                  <tr key={grade.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/grades/${grade.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {grade.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{grade.school.name}</td>
                    <td className="py-3 pr-4">{grade.grade.name}</td>
                    <td className="py-3 pr-4">{grade.section.name}</td>
                    <td className="py-3 pr-4">{grade._count.enrollments}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {grade.teachers.length > 0
                        ? grade.teachers
                            .map((t) => `${t.teacher.firstName} ${t.teacher.lastName}`)
                            .join(", ")
                        : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={grade.isActive ? "success" : "secondary"}>
                        {grade.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/grades/${grade.id}/edit`}>Edit</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {grades.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      {selectedSchool
                        ? "No grades found for this school."
                        : "Select a school to view grades."}
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
                    <Link href={`/grades?page=${meta.page - 1}`}>Previous</Link>
                  </Button>
                )}
                {meta.page < meta.totalPages && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/grades?page=${meta.page + 1}`}>Next</Link>
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
