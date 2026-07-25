import type { SessionTypeCode } from "@/lib/setup-types";

/**
 * Generate every Sunday between start and end (inclusive).
 * Dates are treated as UTC calendar days (see calendar-date.ts).
 */
export function generateSundays(start: Date, end: Date): Date[] {
  const sundays: Date[] = [];
  const current = new Date(start);
  current.setUTCHours(0, 0, 0, 0);

  while (current.getUTCDay() !== 0) {
    current.setUTCDate(current.getUTCDate() + 1);
  }

  const endDate = new Date(end);
  endDate.setUTCHours(23, 59, 59, 999);

  while (current <= endDate) {
    sundays.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 7);
  }

  return sundays;
}

export const SESSION_TYPE_LABELS: Record<SessionTypeCode, string> = {
  INSTRUCTIONAL: "Instructional Day",
  QUIZ_1: "Quiz 1",
  QUIZ_2: "Quiz 2",
  QUIZ_3: "Quiz 3",
  QUIZ_4: "Quiz 4",
  QUIZ_5: "Quiz 5",
  MIDTERM_PROJECT: "Midterm Project",
  FINAL_EXAM: "Final Exam",
  PARENT_MEETING: "Parent Meeting",
  HOLIDAY: "Holiday",
  GRADUATION: "Graduation",
  MAKEUP: "Makeup Day",
};

/**
 * Default session type for an attendance/lesson-plan week number
 * (instructional, quiz, midterm — not holiday / parent conference / graduation).
 *
 * Pattern: 4 instructional weeks, then a quiz on the 5th week.
 * Overrides: week 20 = midterm, week 21 = Quiz 4; week 25 = Quiz 5.
 */
export function defaultSessionTypeForAttendanceWeek(
  attendanceWeekNumber: number
): SessionTypeCode {
  if (attendanceWeekNumber === 20) return "MIDTERM_PROJECT";
  if (attendanceWeekNumber === 21) return "QUIZ_4";

  if (attendanceWeekNumber > 0 && attendanceWeekNumber % 5 === 0) {
    const quizIndex = attendanceWeekNumber / 5;
    if (quizIndex >= 1 && quizIndex <= 5) {
      return `QUIZ_${quizIndex}` as SessionTypeCode;
    }
  }

  return "INSTRUCTIONAL";
}

export type DefaultSessionTypesOptions = {
  /** YYYY-MM-DD Sunday keys that should be HOLIDAY (skipped for week numbering). */
  holidayDateKeys?: Iterable<string>;
  /** YYYY-MM-DD for each Sunday in order; required when holidays are used. */
  sundayDateKeys?: string[];
};

/**
 * Default session types for every Sunday in the year.
 * Last Sunday = Graduation, second-to-last = Parent Teacher Conference.
 * Holiday Sundays (from the year holiday list) are marked HOLIDAY and do not
 * consume an attendance week number.
 */
export function defaultSessionTypesForYear(
  totalSundays: number,
  options?: DefaultSessionTypesOptions
): SessionTypeCode[] {
  if (totalSundays <= 0) return [];

  const holidayKeys = new Set(options?.holidayDateKeys ?? []);
  const sundayKeys = options?.sundayDateKeys;

  const types: SessionTypeCode[] = Array.from(
    { length: totalSundays },
    () => "INSTRUCTIONAL"
  );

  if (totalSundays === 1) {
    const key = sundayKeys?.[0];
    types[0] =
      key && holidayKeys.has(key) ? "HOLIDAY" : "GRADUATION";
    return types;
  }

  types[totalSundays - 1] = "GRADUATION";
  types[totalSundays - 2] = "PARENT_MEETING";

  let attendanceWeek = 0;
  for (let i = 0; i < totalSundays - 2; i++) {
    const key = sundayKeys?.[i];
    if (key && holidayKeys.has(key)) {
      types[i] = "HOLIDAY";
      continue;
    }
    attendanceWeek += 1;
    types[i] = defaultSessionTypeForAttendanceWeek(attendanceWeek);
  }

  return types;
}

/**
 * @deprecated Prefer defaultSessionTypesForYear / defaultSessionTypeForAttendanceWeek.
 * Single-Sunday helper when total year length is known.
 */
export function defaultSessionTypeForSunday(
  sundaySequenceNumber: number,
  totalSundays: number,
  options?: DefaultSessionTypesOptions
): SessionTypeCode {
  const types = defaultSessionTypesForYear(totalSundays, options);
  return types[sundaySequenceNumber - 1] ?? "INSTRUCTIONAL";
}

export function isInstructionalDay(sessionType: SessionTypeCode): boolean {
  return !["HOLIDAY", "PARENT_MEETING", "GRADUATION"].includes(sessionType);
}
