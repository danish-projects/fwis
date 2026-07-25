import type { SessionType } from "@/lib/setup-types";
import { isAttendanceNeeded } from "@/lib/grades/attendance-percentage";
import { prisma } from "@/lib/prisma";
import { calendarDateKey, parseCalendarDateInput } from "@/lib/calendar/calendar-date";
import {
  defaultSessionTypesForYear,
  generateSundays,
} from "@/lib/calendar/generate-sundays";

export type CalendarDayOverride = {
  date: string;
  sessionType: SessionType;
  lessonPlanNumber?: number | null;
};

export function buildDefaultCalendarDayPreview(
  startDate: Date,
  endDate: Date,
  holidayDateKeys: Iterable<string> = []
): Array<{
  date: string;
  sessionType: SessionType;
  lessonPlanNumber: number | null;
}> {
  const holidays = new Set(holidayDateKeys);
  const sundays = generateSundays(startDate, endDate);
  const sundayDateKeys = sundays.map((date) => calendarDateKey(date));
  const sessionTypes = defaultSessionTypesForYear(sundays.length, {
    holidayDateKeys: holidays,
    sundayDateKeys,
  });
  let weekCounter = 0;

  return sundays.map((date, index) => {
    const sessionType = sessionTypes[index] ?? "INSTRUCTIONAL";
    const lessonPlanNumber = isAttendanceNeeded(sessionType)
      ? ++weekCounter
      : null;
    return {
      date: calendarDateKey(date),
      sessionType,
      lessonPlanNumber,
    };
  });
}

async function loadHolidayDateKeysForSchoolLink(
  academicYearSchoolId: string
): Promise<string[]> {
  const link = await prisma.academicYearSchool.findFirst({
    where: { id: academicYearSchoolId, deletedAt: null },
    select: { academicYearId: true },
  });
  if (!link) return [];

  const holidays = await prisma.academicYearHoliday.findMany({
    where: { academicYearId: link.academicYearId, deletedAt: null },
    select: { date: true },
  });
  return holidays.map((holiday) => calendarDateKey(holiday.date));
}

export async function generateCalendarDaysForYear(
  academicYearSchoolId: string,
  startDate: Date,
  endDate: Date,
  dayOverrides?: CalendarDayOverride[]
) {
  const planned =
    dayOverrides && dayOverrides.length > 0
      ? dayOverrides.map((day) => ({
          date: parseCalendarDateInput(day.date),
          sessionType: day.sessionType,
          lessonPlanNumber: day.lessonPlanNumber,
        }))
      : buildDefaultCalendarDayPreview(
          startDate,
          endDate,
          await loadHolidayDateKeysForSchoolLink(academicYearSchoolId)
        ).map((day) => ({
          date: parseCalendarDateInput(day.date),
          sessionType: day.sessionType,
          lessonPlanNumber: day.lessonPlanNumber,
        }));

  if (planned.length === 0) return { created: 0, skipped: 0 };

  const existing = await prisma.academicCalendarDay.findMany({
    where: { academicYearSchoolId, deletedAt: null },
    select: { date: true, lessonPlanNumber: true },
  });
  const existingDates = new Set(existing.map((d) => calendarDateKey(d.date)));
  let weekCounter = existing.reduce(
    (max, d) => Math.max(max, d.lessonPlanNumber ?? 0),
    0
  );

  const toCreate: Array<{
    academicYearSchoolId: string;
    date: Date;
    lessonPlanNumber: number | null;
    sessionType: SessionType;
  }> = [];

  for (const day of planned) {
    const key = calendarDateKey(day.date);
    if (existingDates.has(key)) continue;

    let lessonPlanNumber: number | null = null;
    if (isAttendanceNeeded(day.sessionType)) {
      if (day.lessonPlanNumber != null) {
        lessonPlanNumber = day.lessonPlanNumber;
        weekCounter = Math.max(weekCounter, day.lessonPlanNumber);
      } else {
        lessonPlanNumber = ++weekCounter;
      }
    }

    toCreate.push({
      academicYearSchoolId,
      date: day.date,
      lessonPlanNumber,
      sessionType: day.sessionType,
    });
  }

  if (toCreate.length === 0) {
    return { created: 0, skipped: planned.length };
  }

  await prisma.academicCalendarDay.createMany({ data: toCreate });
  return {
    created: toCreate.length,
    skipped: planned.length - toCreate.length,
  };
}
