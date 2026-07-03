import {
  calendarDateKey,
  isPastOrTodayCalendarDate,
  localTodayKey,
} from "@/lib/calendar/calendar-date";

/** Pick today's calendar day if it matches, otherwise the most recent day on or before today. */
export function selectDefaultCalendarDayId(
  calendarDays: { id: string; date: Date }[]
): string | undefined {
  if (calendarDays.length === 0) return undefined;

  const todayKey = localTodayKey();

  const todayMatch = calendarDays.find(
    (d) => calendarDateKey(d.date) === todayKey
  );
  if (todayMatch) return todayMatch.id;

  const pastOrToday = calendarDays
    .filter((d) => isPastOrTodayCalendarDate(d.date))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return pastOrToday[0]?.id ?? calendarDays[calendarDays.length - 1]?.id;
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
