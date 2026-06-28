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
            {user.fullName ?? user.email}
          </h1>
          <p className="text-muted-foreground">{user.email}</p>
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

      {user.teacher && (
        <Card>
          <CardHeader>
            <CardTitle>Linked Teacher</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">
              {user.teacher.firstName} {user.teacher.lastName}
            </p>
            <p className="text-sm text-muted-foreground">
              {user.teacher.school.name}
              {user.teacher.classrooms.length > 0 &&
                ` · ${user.teacher.classrooms.map((c) => c.classroom.name).join(", ")}`}
            </p>
            <Button asChild variant="link" className="mt-2 h-auto p-0">
              <Link href={`/teachers/${user.teacher.id}`}>View teacher profile</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
