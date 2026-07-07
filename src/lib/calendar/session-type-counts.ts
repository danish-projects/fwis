import { SESSION_TYPE_LABELS } from "@/lib/calendar/generate-sundays";
import { isAttendanceNeeded } from "@/lib/grades/attendance-percentage";
import type { SessionTypeCode } from "@/lib/setup-types";

export type SessionTypeCount = {
  sessionType: SessionTypeCode;
  label: string;
  count: number;
};

/** Session types shown one per line in the calendar summary. */
export const CALENDAR_SUMMARY_LINE_TYPES = [
  "INSTRUCTIONAL",
  "HOLIDAY",
  "MAKEUP",
] as const satisfies readonly SessionTypeCode[];

/** One calendar day each — shown together on a single summary line. */
export const CALENDAR_SUMMARY_SINGLE_DAY_TYPES = [
  "QUIZ_1",
  "QUIZ_2",
  "QUIZ_3",
  "QUIZ_4",
  "QUIZ_5",
  "MIDTERM_PROJECT",
  "FINAL_EXAM",
  "PARENT_MEETING",
  "GRADUATION",
] as const satisfies readonly SessionTypeCode[];

export function buildSessionTypeCounts(
  days: Array<{ sessionType: string }>
): SessionTypeCount[] {
  const counts = new Map<string, number>();
  for (const day of days) {
    counts.set(day.sessionType, (counts.get(day.sessionType) ?? 0) + 1);
  }

  return Object.entries(SESSION_TYPE_LABELS).map(([sessionType, label]) => ({
    sessionType: sessionType as SessionTypeCode,
    label,
    count: counts.get(sessionType) ?? 0,
  }));
}

export function countAttendanceNeededDays(
  days: Array<{ sessionType: string }>
): number {
  return days.filter((day) => isAttendanceNeeded(day.sessionType)).length;
}

export function pickSessionTypeCounts(
  counts: SessionTypeCount[],
  sessionTypes: readonly SessionTypeCode[]
): SessionTypeCount[] {
  const byType = new Map(counts.map((item) => [item.sessionType, item]));
  return sessionTypes.map((sessionType) => {
    const item = byType.get(sessionType);
    return (
      item ?? {
        sessionType,
        label: SESSION_TYPE_LABELS[sessionType],
        count: 0,
      }
    );
  });
}
