/**
 * Calendar days are stored as UTC midnight (Postgres DATE / date-only).
 * Use UTC parts when reading those stored values so they do not shift by a day
 * in US timezones.
 *
 * School “today” / week boundaries use America/Chicago (Central Time, DST-aware).
 * FWIS schools operate in Central; hosting servers are often UTC, so we must not
 * use the process local timezone for attendance defaults or year selection.
 */

/** IANA zone for school calendar “today”. Override with SCHOOL_TIMEZONE if needed. */
export const SCHOOL_TIMEZONE =
  process.env.SCHOOL_TIMEZONE?.trim() || "America/Chicago";

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function calendarDateKey(date: Date | string): string {
  const value = new Date(date);
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type ZonedYmd = {
  year: number;
  month: number;
  day: number;
  /** 0 = Sunday … 6 = Saturday in SCHOOL_TIMEZONE */
  weekday: number;
};

type ZonedDateTime = ZonedYmd & {
  hour: number;
  minute: number;
  second: number;
};

function zonedYmd(now: Date, timeZone: string = SCHOOL_TIMEZONE): ZonedYmd {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;

  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const weekdayName = get("weekday") ?? "Sun";
  const weekday = WEEKDAY_TO_INDEX[weekdayName];

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    weekday === undefined
  ) {
    throw new Error(`Unable to resolve calendar date in ${timeZone}`);
  }

  return { year, month, day, weekday };
}

function zonedDateTime(now: Date, timeZone: string = SCHOOL_TIMEZONE): ZonedDateTime {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;

  const base = zonedYmd(now, timeZone);
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const second = Number(get("second"));

  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    !Number.isFinite(second)
  ) {
    throw new Error(`Unable to resolve clock time in ${timeZone}`);
  }

  return { ...base, hour, minute, second };
}

function ymdKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** School-local "today" as YYYY-MM-DD (America/Chicago by default). */
export function schoolTodayKey(now: Date = new Date()): string {
  const { year, month, day } = zonedYmd(now);
  return ymdKey(year, month, day);
}

/**
 * Sunday that starts the school week containing `now` (Central Time).
 * Sun → that day; Mon–Sat → the previous Sunday.
 */
export function schoolWeekSundayKey(now: Date = new Date()): string {
  const { year, month, day, weekday } = zonedYmd(now);
  const utcMidnight = Date.UTC(year, month - 1, day);
  const sunday = new Date(utcMidnight - weekday * 24 * 60 * 60 * 1000);
  return calendarDateKey(sunday);
}

/** @deprecated Use schoolTodayKey — kept for existing imports. */
export const localTodayKey = schoolTodayKey;

/** @deprecated Use schoolWeekSundayKey — kept for existing imports. */
export const localWeekSundayKey = schoolWeekSundayKey;

export function isPastOrTodayCalendarDate(date: Date | string): boolean {
  return calendarDateKey(date) <= schoolTodayKey();
}

/** Parse an HTML date input value (YYYY-MM-DD) as UTC midnight for DATE columns. */
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

/** UTC midnight Date for “today” in the school timezone (for Prisma @db.Date compares). */
export function schoolTodayUtcDate(now: Date = new Date()): Date {
  return parseCalendarDateInput(schoolTodayKey(now));
}

/**
 * Current Central (school) wall-clock time encoded as a Date whose UTC components
 * match that wall clock. Use for Postgres TIMESTAMP WITHOUT TIME ZONE columns
 * (audit_logs.created_at, etc.) so SmarterASP Pacific hosts still store CT.
 */
export function schoolNowForDbTimestamp(now: Date = new Date()): Date {
  const { year, month, day, hour, minute, second } = zonedDateTime(now);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}
