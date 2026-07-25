import Link from "next/link";
import { notFound } from "next/navigation";
import { getStaffById } from "@/actions/staff";
import { requirePermission } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Staff" };

type PageProps = { params: Promise<{ id: string }> };

export default async function StaffDetailPage({ params }: PageProps) {
  await requirePermission("staff:read");
  const { id } = await params;
  const staff = await getStaffById(id);
  if (!staff) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href="/staff">← Back to staff</Link>
          </Button>
          <h1 className="text-2xl font-bold md:text-3xl">
            {staff.firstName} {staff.lastName}
          </h1>
          <p className="text-muted-foreground">
            {staff.school.name}
            {staff.academicYearName ? ` · ${staff.academicYearName}` : ""}
          </p>
        </div>
        <Button asChild>
          <Link href={`/staff/${staff.id}/edit`}>Edit</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Role (selected year)</p>
            <p className="font-medium">{staff.role?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Gender</p>
            <p className="font-medium capitalize">{staff.genderRef.label.toLowerCase()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{staff.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="font-medium">{staff.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={staff.isActive ? "success" : "secondary"} className="mt-1">
              {staff.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Active Students</p>
            <p className="font-medium">{staff._count.enrollments}</p>
          </div>
          {staff.user && (
            <div className="sm:col-span-2">
              <p className="text-sm text-muted-foreground">Linked App User</p>
              <p className="font-medium">
                {staff.user.fullName ?? staff.user.userId}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Grade (selected year)</CardTitle>
        </CardHeader>
        <CardContent>
          {staff.classrooms.length === 0 ? (
            <p className="text-muted-foreground">No grades assigned.</p>
          ) : (
            <ul className="space-y-2">
              {staff.classrooms.map(({ classroom }) => (
                <li key={classroom.id} className="text-sm">
                  {classroom.name}
                  <span className="text-muted-foreground">
                    {" "}
                    · {classroom.grade.name} {classroom.section.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
