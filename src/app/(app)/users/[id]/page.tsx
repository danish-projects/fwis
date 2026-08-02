import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserById } from "@/actions/users";
import { requirePermission } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "User" };

type PageProps = { params: Promise<{ id: string }> };

export default async function UserDetailPage({ params }: PageProps) {
  await requirePermission("users:read");
  const { id } = await params;
  const user = await getUserById(id);
  if (!user) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href="/users">← Back to users</Link>
          </Button>
          <h1 className="text-2xl font-bold md:text-3xl">
            {user.fullName ?? user.userId}
          </h1>
          <p className="text-muted-foreground">{user.userId}</p>
        </div>
        <Button asChild>
          <Link href={`/users/${user.id}/edit`}>Edit</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={user.isActive ? "success" : "secondary"} className="mt-1">
              {user.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Roles</p>
            <p className="font-medium">
              {user.roles.map((r) => r.role.name).join(", ") || "—"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Section scope</p>
            <p className="font-medium">
              {user.gender === "MALE"
                ? "Boys only"
                : user.gender === "FEMALE"
                  ? "Girls only"
                  : "All sections"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-sm text-muted-foreground">School Access</p>
            <p className="font-medium">
              {user.schools.map((s) => s.school.name).join(", ") || "All schools"}
            </p>
          </div>
        </CardContent>
      </Card>

      {user.staff.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Linked Staff</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user.staff.map((staff) => (
              <div key={staff.id} className="space-y-1">
                <p className="font-medium">
                  {staff.firstName} {staff.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {staff.school.name}
                  {staff.assignments.length > 0 &&
                    ` · ${staff.assignments
                      .map((a) => {
                        const year = a.academicYearSchool.academicYear.name;
                        const grade = a.classroom?.name;
                        const role = a.role.name;
                        return grade
                          ? `${year}: ${role} · ${grade}`
                          : `${year}: ${role}`;
                      })
                      .join("; ")}`}
                </p>
                <Button asChild variant="link" className="mt-1 h-auto p-0">
                  <Link href={`/staff/${staff.id}`}>View staff profile</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
