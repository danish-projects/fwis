import {
  calendarDateKey,
  localTodayKey,
} from "@/lib/calendar/calendar-date";
import { isAttendanceNeeded } from "@/lib/grades/attendance-percentage";

export type LessonPlanWeekOption = {
  calendarDayId: string;
  lessonPlanNumber: number;
  date: Date;
  sessionType: string;
};

export function buildLessonPlanWeekOptions(
  calendarDays: Array<{
    id: string;
    date: Date;
    lessonPlanNumber: number | null;
    sessionType: string;
  }>
): LessonPlanWeekOption[] {
  const seen = new Set<number>();
  const options: LessonPlanWeekOption[] = [];

  for (const day of calendarDays) {
    if (!isAttendanceNeeded(day.sessionType) || day.lessonPlanNumber == null) {
      continue;
    }
    if (seen.has(day.lessonPlanNumber)) continue;
    seen.add(day.lessonPlanNumber);
    options.push({
      calendarDayId: day.id,
      lessonPlanNumber: day.lessonPlanNumber,
      date: day.date,
      sessionType: day.sessionType,
    });
  }

  return options.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export function selectCurrentLessonPlanWeek(
  weeks: LessonPlanWeekOption[]
): LessonPlanWeekOption | null {
  if (weeks.length === 0) return null;

  const todayKey = localTodayKey();
  const todayWeek = weeks.find(
    (week) => calendarDateKey(week.date) === todayKey
  );
  if (todayWeek) return todayWeek;

  const latestPastWeek = [...weeks]
    .reverse()
    .find((week) => calendarDateKey(week.date) <= todayKey);
  if (latestPastWeek) return latestPastWeek;

  return weeks[0] ?? null;
}
