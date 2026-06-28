import type { SessionType, AttendanceStatus } from "@/lib/setup-types";
import { QUIZ_SESSION_TYPE_CODES } from "@/lib/setup-types";

/** Session types where teachers must take attendance. */
export const ATTENDANCE_NEEDED_SESSION_TYPES: SessionType[] = [
  "INSTRUCTIONAL",
  ...QUIZ_SESSION_TYPE_CODES,
  "MIDTERM_PROJECT",
  "FINAL_EXAM",
];

export function isAttendanceNeeded(sessionType: string): boolean {
  return (ATTENDANCE_NEEDED_SESSION_TYPES as readonly string[]).includes(
    sessionType
  );
}

/** Days that count toward attendance % (same as attendance-needed days). */
export const ATTENDANCE_COUNTABLE_SESSION_TYPES: SessionType[] = [
  ...ATTENDANCE_NEEDED_SESSION_TYPES,
];

/** Calendar days teachers can mark attendance on. */
export const ATTENDANCE_MARKABLE_SESSION_TYPES: SessionType[] = [
  ...ATTENDANCE_NEEDED_SESSION_TYPES,
];

export function isCountableAttendanceDay(sessionType: string): boolean {
  return isAttendanceNeeded(sessionType);
}

export function countsAsPresent(status: string): boolean {
  return status === "PRESENT" || status === "TARDY";
}

export function calculateAttendancePercentage(input: {
  totalCountableDays: number;
  presentOrTardyDays: number;
}): number {
  if (input.totalCountableDays === 0) return 100;
  const pct = (input.presentOrTardyDays / input.totalCountableDays) * 100;
  return Math.round(pct * 100) / 100;
}
