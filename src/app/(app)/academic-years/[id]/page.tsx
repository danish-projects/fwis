import Link from "next/link";
import { notFound } from "next/navigation";
import { getAcademicYearById } from "@/actions/academic-years";
import { requirePermission } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Academic Year" };

type PageProps = { params: Promise<{ id: string }> };

export default async function AcademicYearDetailPage({ params }: PageProps) {
  await requirePermission("academic-years:read");
  const { id } = await params;
  const year = await getAcademicYearById(id);
  if (!year) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href="/academic-years">← Back to academic years</Link>
          </Button>
          <h1 className="text-2xl font-bold md:text-3xl">{year.name}</h1>
          <p className="text-muted-foreground">{year.school.name}</p>
        </div>
        <Button asChild>
          <Link href={`/academic-years/${year.id}/edit`}>Edit</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Start Date</p>
            <p className="font-medium">{formatDate(year.startDate)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">End Date</p>
            <p className="font-medium">{formatDate(year.endDate)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={year.isActive ? "success" : "secondary"} className="mt-1">
              {year.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Calendar Days</p>
            <p className="font-medium">{year._count.calendarDays}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Enrollments</p>
            <p className="font-medium">{year._count.enrollments}</p>
          </div>
        </CardContent>
      </Card>

      <Button asChild variant="outline">
        <Link href={`/calendar?school=${year.schoolId}&year=${year.id}`}>
          View Calendar
        </Link>
      </Button>
    </div>
  );
}
