import { CalendarDays } from "lucide-react";
import { fetchDashboardCalendarHighlights } from "@/lib/calendar/dashboard-calendar-highlights";
import { resolveAcademicYearForSchool } from "@/lib/academic-year/resolve-year";
import type { AcademicYearSummary } from "@/lib/academic-year/constants";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type DashboardCalendarHighlightsProps = {
  schoolId?: string | null;
  academicYearId?: string | null;
  selectedYear?: AcademicYearSummary | null;
  title?: string;
};

async function resolveAcademicYearId({
  schoolId,
  academicYearId,
  selectedYear,
}: DashboardCalendarHighlightsProps): Promise<string | null> {
  if (academicYearId) return academicYearId;

  if (schoolId) {
    const year = await resolveAcademicYearForSchool(schoolId, selectedYear ?? null);
    return year?.id ?? null;
  }

  if (selectedYear) {
    const year = await prisma.academicYear.findFirst({
      where: {
        name: selectedYear.name,
        deletedAt: null,
        school: { deletedAt: null, isActive: true },
      },
      orderBy: { school: { name: "asc" } },
      select: { id: true },
    });
    return year?.id ?? null;
  }

  return null;
}

export async function DashboardCalendarHighlights({
  schoolId,
  academicYearId,
  selectedYear,
  title = "Academic Calendar",
}: DashboardCalendarHighlightsProps) {
  const resolvedYearId = await resolveAcademicYearId({
    schoolId,
    academicYearId,
    selectedYear,
  });
  const highlights = await fetchDashboardCalendarHighlights(resolvedYearId);

  if (!highlights) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No calendar data for the selected academic year.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Current Week
          </p>
          {highlights.currentWeek ? (
            <>
              <p className="text-lg font-semibold">{highlights.currentWeek.weekLabel}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(highlights.currentWeek.date)}
              </p>
              <p className="text-xs text-muted-foreground">
                {highlights.currentWeek.sessionLabel}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No weeks scheduled yet</p>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Upcoming Quiz
          </p>
          {highlights.upcomingQuiz ? (
            <>
              <p className="text-lg font-semibold">{highlights.upcomingQuiz.label}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(highlights.upcomingQuiz.date)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming quizzes</p>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Upcoming Holidays
          </p>
          {highlights.upcomingHolidays.length > 0 ? (
            <ul className="space-y-1.5">
              {highlights.upcomingHolidays.map((holiday) => (
                <li key={holiday.date.toISOString()} className="text-sm">
                  <span className="font-medium">{formatDate(holiday.date)}</span>
                  <span className="text-muted-foreground"> · {holiday.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming holidays</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
