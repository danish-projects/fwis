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
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href="/academic-years">← Back to academic years</Link>
          </Button>
          <h1 className="text-2xl font-bold md:text-3xl">{year.name}</h1>
          <p className="text-muted-foreground">
            Global academic year · {year.schoolLinks.length} school
            {year.schoolLinks.length === 1 ? "" : "s"} linked
          </p>
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
          <div className="sm:col-span-2">
            <p className="text-sm text-muted-foreground">Lesson plans (Drive)</p>
            <p className="text-sm">
              Resolved by year name under FWIS Docs:{" "}
              <span className="font-medium">
                FWIS Docs/{year.name}/Lesson Plans/&lt;grade&gt;
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Parent folder ID is set via{" "}
              <code className="text-xs">GOOGLE_DRIVE_FWIS_DOCS_FOLDER_ID</code>.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linked Schools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Code</th>
                  <th className="pb-3 pr-4 font-medium">School</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Calendar</th>
                  <th className="pb-3 font-medium">Enrollments</th>
                </tr>
              </thead>
              <tbody>
                {year.schoolLinks.map((link) => (
                  <tr key={link.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-mono text-xs">{link.school.code}</td>
                    <td className="py-3 pr-4">{link.school.name}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={link.isActive ? "success" : "secondary"}>
                        {link.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">{link._count.calendarDays}</td>
                    <td className="py-3">{link._count.enrollments}</td>
                  </tr>
                ))}
                {year.schoolLinks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      No schools linked to this year yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {year.schoolLinks.length > 0 && (
        <Button asChild variant="outline">
          <Link href="/calendar">View Calendar</Link>
        </Button>
      )}
    </div>
  );
}
