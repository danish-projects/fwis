import type { SessionType } from "@/lib/setup-types";
import { isAttendanceNeeded } from "@/lib/grades/attendance-percentage";
import { prisma } from "@/lib/prisma";
import { defaultSessionTypeForSunday, generateSundays } from "@/lib/calendar/generate-sundays";

export async function generateCalendarDaysForYear(
  academicYearSchoolId: string,
  startDate: Date,
  endDate: Date
) {
  const sundays = generateSundays(startDate, endDate);
  if (sundays.length === 0) return { created: 0, skipped: 0 };

  const existing = await prisma.academicCalendarDay.findMany({
    where: { academicYearSchoolId, deletedAt: null },
    select: { date: true, lessonPlanNumber: true },
  });
  const existingDates = new Set(
    existing.map((d) => new Date(d.date).toISOString().slice(0, 10))
  );
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

  sundays.forEach((date, index) => {
    const key = date.toISOString().slice(0, 10);
    if (existingDates.has(key)) return;
    const sessionType = defaultSessionTypeForSunday(index + 1);
    const lessonPlanNumber = isAttendanceNeeded(sessionType)
      ? ++weekCounter
      : null;
    toCreate.push({
      academicYearSchoolId,
      date,
      lessonPlanNumber,
      sessionType,
    });
  });

  if (toCreate.length === 0) {
    return { created: 0, skipped: sundays.length };
  }

  await prisma.academicCalendarDay.createMany({ data: toCreate });
  return { created: toCreate.length, skipped: sundays.length - toCreate.length };
}
