import { prisma } from "@/lib/prisma";
import { SESSION_TYPE_LABELS } from "@/lib/calendar/generate-sundays";
import { formatLessonPlanLabel } from "@/lib/calendar/lesson-plan";
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

function startOfDayMs(date: Date): number {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value.getTime();
}

function sessionLabel(sessionType: string): string {
  return (
    SESSION_TYPE_LABELS[sessionType as SessionTypeCode] ?? sessionType.replace(/_/g, " ")
  );
}

export function buildDashboardCalendarHighlights(
  calendarDays: CalendarDayRow[]
): DashboardCalendarHighlights {
  const todayMs = startOfDayMs(new Date());
  const sorted = [...calendarDays].sort(
    (a, b) => startOfDayMs(a.date) - startOfDayMs(b.date)
  );

  const attendanceWeeks = sorted.filter(
    (day) =>
      isAttendanceNeeded(day.sessionType) && day.lessonPlanNumber != null
  );

  const todayWeek = attendanceWeeks.find(
    (day) => startOfDayMs(day.date) === todayMs
  );
  const latestPastWeek = [...attendanceWeeks]
    .reverse()
    .find((day) => startOfDayMs(day.date) <= todayMs);
  const nextWeek = attendanceWeeks.find((day) => startOfDayMs(day.date) > todayMs);

  const currentDay = todayWeek ?? latestPastWeek ?? nextWeek ?? null;

  const upcomingQuiz =
    currentDay &&
    (QUIZ_SESSION_TYPE_CODES as readonly string[]).includes(currentDay.sessionType)
      ? sorted.find(
          (day) =>
            (QUIZ_SESSION_TYPE_CODES as readonly string[]).includes(
              day.sessionType
            ) && startOfDayMs(day.date) > todayMs
        )
      : sorted.find(
          (day) =>
            (QUIZ_SESSION_TYPE_CODES as readonly string[]).includes(
              day.sessionType
            ) && startOfDayMs(day.date) >= todayMs
        );

  const upcomingHolidays = sorted
    .filter(
      (day) => day.sessionType === "HOLIDAY" && startOfDayMs(day.date) >= todayMs
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
  academicYearId: string | null | undefined
): Promise<DashboardCalendarHighlights | null> {
  if (!academicYearId) return null;

  const calendarDays = await prisma.academicCalendarDay.findMany({
    where: { academicYearId, deletedAt: null },
    orderBy: { date: "asc" },
    select: {
      date: true,
      lessonPlanNumber: true,
      sessionType: true,
    },
  });

  if (calendarDays.length === 0) return null;

  return buildDashboardCalendarHighlights(calendarDays);
}
