import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { getUserFormOptions, getUsers } from "@/actions/users";
import { getSessionUser, requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { UserRoleCode } from "@prisma/client";

export const metadata = { title: "Users" };

type PageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    role?: string;
    schoolId?: string;
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

export default async function UsersPage({ searchParams }: PageProps) {
  await requirePermission("users:read");
  const user = await getSessionUser();
  const canCreate = user && hasPermission(user.roles, "users:create");

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const role = params.role as UserRoleCode | undefined;
  const isActive =
    params.isActive === "true"
      ? true
      : params.isActive === "false"
        ? false
        : undefined;

  const [{ data: users, meta }, { roles, schools }] = await Promise.all([
    getUsers({
      page,
      search: params.search,
      role,
      schoolId: params.schoolId,
      isActive,
    }),
    getUserFormOptions(),
  ]);

  const queryBase = {
    search: params.search,
    role: params.role,
    schoolId: params.schoolId,
    isActive: params.isActive,
  };

  const showSchoolFilter = schools.length > 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Users & Roles</h1>
          <p className="text-muted-foreground">
            Manage app users, role assignments, and school access
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/users/new">
              <Plus className="h-4 w-4" />
              Add User
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
              name="role"
              defaultValue={role ?? ""}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All roles</option>
              {roles.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
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
                  <th className="pb-3 pr-4 font-medium">Name</th>
                  <th className="pb-3 pr-4 font-medium">Email</th>
                  <th className="pb-3 pr-4 font-medium">Roles</th>
                  <th className="pb-3 pr-4 font-medium">Schools</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((appUser) => (
                  <tr key={appUser.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/users/${appUser.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {appUser.fullName ?? "—"}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{appUser.email}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {appUser.roles.map((r) => r.role.name).join(", ") || "—"}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {appUser.schools.map((s) => s.school.name).join(", ") ||
                        "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={appUser.isActive ? "success" : "secondary"}>
                        {appUser.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/users/${appUser.id}/edit`}>Edit</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No users found.
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
                    <Link href={`/users${buildQuery(queryBase, { page: String(meta.page - 1) })}`}>
                      Previous
                    </Link>
                  </Button>
                )}
                {meta.page < meta.totalPages && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/users${buildQuery(queryBase, { page: String(meta.page + 1) })}`}>
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
