import Link from "next/link";
import { notFound } from "next/navigation";
import { getSchoolById } from "@/actions/schools";
import { requirePermission } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type PageProps = { params: Promise<{ id: string }> };

export default async function SchoolDetailPage({ params }: PageProps) {
  const { id } = await params;
  await requirePermission("schools:read", { schoolId: id });
  const school = await getSchoolById(id);
  if (!school) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{school.name}</h1>
          <p className="font-mono text-sm text-muted-foreground">{school.code}</p>
          <p className="text-muted-foreground">
            {school.city}, {school.state}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/schools">Back</Link>
          </Button>
          <Button asChild>
            <Link href={`/schools/${school.id}/edit`}>Edit</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Staff", value: school._count.staff },
          { label: "Students", value: school._count.enrollments },
          { label: "Grades", value: school._count.classroomSchools },
          {
            label: "Status",
            value: school.isActive ? "Active" : "Inactive",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>School Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">School Code</p>
            <p className="font-mono">{school.code}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Address</p>
            <p>{school.address ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Zip Code</p>
            <p>{school.zipCode ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p>{school.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p>{school.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={school.isActive ? "success" : "secondary"}>
              {school.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p>{formatDate(school.createdAt)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
