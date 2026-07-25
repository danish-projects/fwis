import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { getSchools } from "@/actions/schools";
import { getSessionUser, requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata = { title: "Schools" };

type PageProps = {
  searchParams: Promise<{ page?: string; search?: string }>;
};

export default async function SchoolsPage({ searchParams }: PageProps) {
  await requirePermission("schools:read");
  const user = await getSessionUser();
  const canCreate = user && hasPermission(user.roles, "schools:create");
  const canUpdate = user && hasPermission(user.roles, "schools:update");

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search;

  const { data: schools, meta } = await getSchools({ page, search });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Schools</h1>
          <p className="text-muted-foreground">
            Manage Faizan Weekend Islamic Schools
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/schools/new">
              <Plus className="h-4 w-4" />
              Add School
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
                placeholder="Search schools..."
                defaultValue={search}
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
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Code</th>
                  <th className="pb-3 pr-4 font-medium">School</th>
                  <th className="pb-3 pr-4 font-medium">Location</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((school) => (
                  <tr key={school.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-mono text-xs">{school.code}</td>
                    <td className="py-3 pr-4">
                      <Link
                        href={`/schools/${school.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {school.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {school.city}, {school.state}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={school.isActive ? "success" : "secondary"}>
                        {school.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3">
                      {canUpdate && (
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/schools/${school.id}/edit`}>Edit</Link>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {schools.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No schools found.
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
                      href={`/schools?page=${meta.page - 1}${search ? `&search=${search}` : ""}`}
                    >
                      Previous
                    </Link>
                  </Button>
                )}
                {meta.page < meta.totalPages && (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/schools?page=${meta.page + 1}${search ? `&search=${search}` : ""}`}
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
