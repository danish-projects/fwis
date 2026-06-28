import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { getAcademicYears } from "@/actions/academic-years";
import { getSessionUser, requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Academic Years" };

type PageProps = {
  searchParams: Promise<{ page?: string; search?: string; schoolId?: string }>;
};

export default async function AcademicYearsPage({ searchParams }: PageProps) {
  await requirePermission("academic-years:read");
  const user = await getSessionUser();
  const canCreate = user && hasPermission(user.roles, "academic-years:create");

  const params = await searchParams;
  const page = Number(params.page) || 1;

  const { data: years, meta } = await getAcademicYears({
    page,
    search: params.search,
    schoolId: params.schoolId,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Academic Years</h1>
          <p className="text-muted-foreground">
            Manage school academic years — one active year per school
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/academic-years/new">
              <Plus className="h-4 w-4" />
              New Academic Year
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
                placeholder="Search by year name..."
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
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Year</th>
                  <th className="pb-3 pr-4 font-medium">School</th>
                  <th className="pb-3 pr-4 font-medium">Dates</th>
                  <th className="pb-3 pr-4 font-medium">Calendar Days</th>
                  <th className="pb-3 pr-4 font-medium">Enrollments</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {years.map((year) => (
                  <tr key={year.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/academic-years/${year.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {year.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{year.school.name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDate(year.startDate)} – {formatDate(year.endDate)}
                    </td>
                    <td className="py-3 pr-4">{year._count.calendarDays}</td>
                    <td className="py-3 pr-4">{year._count.enrollments}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={year.isActive ? "success" : "secondary"}>
                        {year.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/academic-years/${year.id}/edit`}>Edit</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {years.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No academic years found.
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
                    <Link href={`/academic-years?page=${meta.page - 1}`}>Previous</Link>
                  </Button>
                )}
                {meta.page < meta.totalPages && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/academic-years?page=${meta.page + 1}`}>Next</Link>
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
