import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCalendarDays,
  getCalendarPageContext,
} from "@/actions/calendar";
import { getSessionUser, requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { CalendarBulkGenerate } from "@/components/calendar/calendar-bulk-generate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SESSION_TYPE_LABELS } from "@/lib/calendar/generate-sundays";
import { formatLessonPlanLabel } from "@/lib/calendar/lesson-plan";
import { isAttendanceNeeded } from "@/lib/grades/attendance-percentage";
import { asSessionType } from "@/lib/setup-types";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Academic Calendar" };

type PageProps = {
  searchParams: Promise<{ school?: string; year?: string }>;
};

export default async function CalendarPage({ searchParams }: PageProps) {
  await requirePermission("calendar:read");
  const user = await getSessionUser();
  const canUpdate = user && hasPermission(user.roles, "calendar:update");
  const canCreate = user && hasPermission(user.roles, "calendar:create");

  const params = await searchParams;
  const ctx = await getCalendarPageContext(params.school);

  const academicYearId =
    params.year && ctx.years.some((y) => y.id === params.year)
      ? params.year
      : ctx.academicYearId;

  if (!academicYearId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Academic Calendar</h1>
          <p className="text-muted-foreground">Sunday session calendar by academic year</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No academic years available.{" "}
            <Link href="/academic-years/new" className="text-primary underline">
              Create an academic year
            </Link>{" "}
            first.
          </CardContent>
        </Card>
      </div>
    );
  }

  const yearData = await getCalendarDays(academicYearId);
  if (!yearData) notFound();

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
          {canCreate && <CalendarBulkGenerate academicYearId={academicYearId} />}
          <Button asChild variant="outline" size="sm">
            <Link href="/academic-years">Manage Years</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
            {ctx.showSchoolPicker && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">School</label>
                <select
                  name="school"
                  defaultValue={ctx.schoolId ?? ""}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {ctx.schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Academic Year</label>
              <select
                name="year"
                defaultValue={academicYearId}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {ctx.years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                    {y.isActive ? " (Active)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="secondary">
              Apply
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Lesson Plan</th>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Session Type</th>
                  <th className="pb-3 pr-4 font-medium">Attendance Needed</th>
                  <th className="pb-3 pr-4 font-medium">Records</th>
                  {canUpdate && <th className="pb-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {yearData.calendarDays.map((day) => {
                  const attendanceNeeded = isAttendanceNeeded(day.sessionType);

                  return (
                  <tr key={day.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">
                      {formatLessonPlanLabel(day.lessonPlanNumber)}
                    </td>
                    <td className="py-3 pr-4">{formatDate(day.date)}</td>
                    <td className="py-3 pr-4">
                      <Badge variant="outline">
                        {SESSION_TYPE_LABELS[asSessionType(day.sessionType)]}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={attendanceNeeded ? "success" : "secondary"}>
                        {attendanceNeeded ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {day._count.attendance} record(s)
                    </td>
                    {canUpdate && (
                      <td className="py-3">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/calendar/${day.id}/edit`}>Edit</Link>
                        </Button>
                      </td>
                    )}
                  </tr>
                  );
                })}
                {yearData.calendarDays.length === 0 && (
                  <tr>
                    <td
                      colSpan={canUpdate ? 6 : 5}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No calendar days yet. Use &quot;Generate Sundays&quot; to create them.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
