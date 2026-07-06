import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCalendarDays,
  getCalendarPageContext,
} from "@/actions/calendar";
import { getSessionUser, requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { CalendarBulkGenerate } from "@/components/calendar/calendar-bulk-generate";
import { CalendarDaysTable } from "@/components/calendar/calendar-days-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Academic Calendar" };

export default async function CalendarPage() {
  await requirePermission("calendar:read");
  const user = await getSessionUser();
  const canUpdate = user && hasPermission(user.roles, "calendar:update");
  const canCreate = user && hasPermission(user.roles, "calendar:create");

  const ctx = await getCalendarPageContext();
  const academicYearId = ctx.academicYearId;

  if (!academicYearId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Academic Calendar</h1>
          <p className="text-muted-foreground">
            Sunday session calendar for the selected school and academic year
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No academic year is available for the selected school.{" "}
            <Link href="/academic-years/new" className="text-primary underline">
              Create an academic year
            </Link>{" "}
            or choose a different year in the sidebar.
          </CardContent>
        </Card>
      </div>
    );
  }

  const yearData = await getCalendarDays(academicYearId);
  if (!yearData) notFound();

  const days = yearData.calendarDays.map((day) => ({
    id: day.id,
    date: day.date.toISOString(),
    lessonPlanNumber: day.lessonPlanNumber,
    sessionType: day.sessionType,
    attendanceCount: day._count.attendance,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Academic Calendar</h1>
          <p className="text-muted-foreground">
            {yearData.name} · {yearData.school.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreate && (
            <>
              <Button asChild size="sm">
                <Link href="/calendar/new">Add Day</Link>
              </Button>
              <CalendarBulkGenerate academicYearId={academicYearId} />
            </>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href="/academic-years">Manage Years</Link>
          </Button>
        </div>
      </div>

      <CalendarDaysTable days={days} canUpdate={!!canUpdate} />
    </div>
  );
}
