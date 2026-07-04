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

/** Parse an HTML date input value (YYYY-MM-DD) as UTC midnight. */
export function parseCalendarDateInput(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    throw new Error("Invalid date format");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day));
}
