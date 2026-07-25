import { prisma } from "@/lib/prisma";
import {
  calendarDateKey,
  localTodayKey,
} from "@/lib/calendar/calendar-date";
import { SESSION_TYPE_LABELS } from "@/lib/calendar/generate-sundays";
import { formatLessonPlanLabel } from "@/lib/calendar/lesson-plan";
import { selectDefaultCalendarDay } from "@/lib/calendar/select-default-day";
import { isAttendanceNeeded } from "@/lib/grades/attendance-percentage";
import {
  QUIZ_SESSION_TYPE_CODES,
  type QuizSessionTypeCode,
  type SessionTypeCode,
} from "@/lib/setup-types";

export type DashboardCalendarHighlights = {
  currentWeek: {
    weekLabel: string;
    date: Date;
    sessionLabel: string;
  } | null;
  upcomingQuiz: {
    label: string;
    date: Date;
  } | null;
  upcomingHolidays: Array<{
    label: string;
    date: Date;
  }>;
};

type CalendarDayRow = {
  date: Date;
  lessonPlanNumber: number | null;
  sessionType: string;
};

function sessionLabel(sessionType: string): string {
  return (
    SESSION_TYPE_LABELS[sessionType as SessionTypeCode] ??
    sessionType.replace(/_/g, " ")
  );
}

export function buildDashboardCalendarHighlights(
  calendarDays: CalendarDayRow[],
  now: Date = new Date()
): DashboardCalendarHighlights {
  const todayKey = localTodayKey(now);
  const sorted = [...calendarDays].sort((a, b) =>
    calendarDateKey(a.date).localeCompare(calendarDateKey(b.date))
  );

  const attendanceWeeks = sorted.filter(
    (day) =>
      isAttendanceNeeded(day.sessionType) && day.lessonPlanNumber != null
  );

  const currentDay =
    selectDefaultCalendarDay(attendanceWeeks, now) ??
    selectDefaultCalendarDay(sorted, now) ??
    null;

  const upcomingQuiz =
    currentDay &&
    (QUIZ_SESSION_TYPE_CODES as readonly string[]).includes(currentDay.sessionType)
      ? sorted.find(
          (day) =>
            (QUIZ_SESSION_TYPE_CODES as readonly string[]).includes(
              day.sessionType
            ) && calendarDateKey(day.date) > todayKey
        )
      : sorted.find(
          (day) =>
            (QUIZ_SESSION_TYPE_CODES as readonly string[]).includes(
              day.sessionType
            ) && calendarDateKey(day.date) >= todayKey
        );

  const upcomingHolidays = sorted
    .filter(
      (day) =>
        day.sessionType === "HOLIDAY" && calendarDateKey(day.date) >= todayKey
    )
    .slice(0, 4)
    .map((day) => ({
      label: sessionLabel(day.sessionType),
      date: day.date,
    }));

  return {
    currentWeek: currentDay
      ? {
          weekLabel: formatLessonPlanLabel(currentDay.lessonPlanNumber),
          date: currentDay.date,
          sessionLabel: sessionLabel(currentDay.sessionType),
        }
      : null,
    upcomingQuiz: upcomingQuiz
      ? {
          label: sessionLabel(upcomingQuiz.sessionType as QuizSessionTypeCode),
          date: upcomingQuiz.date,
        }
      : null,
    upcomingHolidays,
  };
}

export async function fetchDashboardCalendarHighlights(
  academicYearSchoolId: string | null | undefined
): Promise<DashboardCalendarHighlights | null> {
  if (!academicYearSchoolId) return null;

  const calendarDays = await prisma.academicCalendarDay.findMany({
    where: { academicYearSchoolId, deletedAt: null },
    orderBy: { date: "asc" },
    select: {
      date: true,
      lessonPlanNumber: true,
      sessionType: true,
    },
  });

  if (calendarDays.length === 0) return null;

  const yearLink = await prisma.academicYearSchool.findFirst({
    where: { id: academicYearSchoolId, deletedAt: null },
    select: { academicYearId: true },
  });
  const holidayRows = yearLink
    ? await prisma.academicYearHoliday.findMany({
        where: { academicYearId: yearLink.academicYearId, deletedAt: null },
        select: { date: true, name: true },
      })
    : [];
  const holidayNameByDate = new Map(
    holidayRows.map((h) => [calendarDateKey(h.date), h.name?.trim() || null])
  );

  const highlights = buildDashboardCalendarHighlights(calendarDays);
  return {
    ...highlights,
    upcomingHolidays: highlights.upcomingHolidays.map((holiday) => ({
      ...holiday,
      label:
        holidayNameByDate.get(calendarDateKey(holiday.date)) || holiday.label,
    })),
  };
}
