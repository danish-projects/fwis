/**
 * Calendar days are stored as UTC midnight (date-only). Use UTC parts for the
 * intended calendar date so US timezones do not shift them back one day.
 */

export function calendarDateKey(date: Date | string): string {
  const value = new Date(date);
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Local "today" as YYYY-MM-DD (school operates in the viewer's locale). */
export function localTodayKey(): string {
  const value = new Date();
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isPastOrTodayCalendarDate(date: Date | string): boolean {
  return calendarDateKey(date) <= localTodayKey();
}
