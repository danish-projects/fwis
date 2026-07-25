import {
  calendarDateKey,
  localTodayKey,
  localWeekSundayKey,
} from "@/lib/calendar/calendar-date";

/**
 * Default session / calendar day for attendance, dashboards, etc.
 *
 * - Before first calendar date → first day
 * - After last calendar date → last day
 * - Otherwise → Sunday of the current week (today if Sunday, else previous Sunday);
 *   if that Sunday is missing from the calendar, the nearest earlier calendar day
 */
export function selectDefaultCalendarDay<T extends { date: Date }>(
  calendarDays: T[],
  now: Date = new Date()
): T | undefined {
  if (calendarDays.length === 0) return undefined;

  const sorted = [...calendarDays].sort((a, b) =>
    calendarDateKey(a.date).localeCompare(calendarDateKey(b.date))
  );

  const todayKey = localTodayKey(now);
  const firstKey = calendarDateKey(sorted[0].date);
  const lastKey = calendarDateKey(sorted[sorted.length - 1].date);

  if (todayKey < firstKey) return sorted[0];
  if (todayKey > lastKey) return sorted[sorted.length - 1];

  const weekSundayKey = localWeekSundayKey(now);

  const exactSunday = sorted.find(
    (d) => calendarDateKey(d.date) === weekSundayKey
  );
  if (exactSunday) return exactSunday;

  const previousInCalendar = [...sorted]
    .reverse()
    .find((d) => calendarDateKey(d.date) <= weekSundayKey);
  if (previousInCalendar) return previousInCalendar;

  return sorted[0];
}

export function selectDefaultCalendarDayId(
  calendarDays: { id: string; date: Date }[],
  now?: Date
): string | undefined {
  return selectDefaultCalendarDay(calendarDays, now)?.id;
}

export function formatSundayDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
