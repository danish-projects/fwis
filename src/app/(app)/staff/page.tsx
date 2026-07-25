import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { getStaffMembers } from "@/actions/staff";
import { getSessionUser, requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getSelectedSchool } from "@/lib/school/resolve-school";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata = { title: "Staff" };

type PageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
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

export default async function StaffPage({ searchParams }: PageProps) {
  await requirePermission("staff:read");
  const user = await getSessionUser();
  const canCreate = user && hasPermission(user.roles, "staff:create");
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

  const { data: staffMembers, meta } = await getStaffMembers({
    page,
    search: params.search,
    gender,
    isActive,
  });

  const queryBase = {
    search: params.search,
    gender: params.gender,
    isActive: params.isActive,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Staff</h1>
          <p className="text-muted-foreground">
            Manage staff and grade assignments for the selected academic year
            {selectedSchool ? ` · ${selectedSchool.name}` : ""}
            {staffMembers[0]?.academicYearName
              ? ` · ${staffMembers[0].academicYearName}`
              : ""}
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/staff/new">
              <Plus className="h-4 w-4" />
              Add Staff
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
              Filter
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Staff</th>
                  <th className="pb-3 pr-4 font-medium">Role</th>
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
                {staffMembers.map((staff) => (
                  <tr key={staff.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/staff/${staff.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {staff.firstName} {staff.lastName}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {staff.role?.name ?? "—"}
                    </td>
                    <td className="py-3 pr-4 capitalize text-muted-foreground">
                      {staff.genderRef.label.toLowerCase()}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {staff.school.name}
                    </td>
                    <td className="py-3 pr-4">{staff.email}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {staff.classrooms.length > 0
                        ? staff.classrooms
                            .map((c) => c.classroom.name)
                            .join(", ")
                        : "—"}
                    </td>
                    <td className="py-3 pr-4">{staff._count.enrollments}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={staff.isActive ? "success" : "secondary"}>
                        {staff.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/staff/${staff.id}/edit`}>Edit</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {staffMembers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted-foreground">
                      {selectedSchool
                        ? "No staff found for this school."
                        : "Select a school to view staff."}
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
                    <Link href={`/staff${buildQuery(queryBase, { page: String(meta.page - 1) })}`}>
                      Previous
                    </Link>
                  </Button>
                )}
                {meta.page < meta.totalPages && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/staff${buildQuery(queryBase, { page: String(meta.page + 1) })}`}>
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
