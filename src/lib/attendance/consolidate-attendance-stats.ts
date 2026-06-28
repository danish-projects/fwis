import type { AttendanceStatus, SessionType } from "@/lib/setup-types";
import { isEditableAttendanceSessionType } from "@/lib/attendance/session-type-styles";
import {
  calculateAttendancePercentage,
  countsAsPresent,
} from "@/lib/grades/attendance-percentage";

export type ConsolidateCalendarDay = {
  id: string;
  date: Date;
  sessionType: SessionType;
};

export type AttendanceWeekSummary = {
  totalWeeks: number;
  pastWeeks: number;
  editableDays: ConsolidateCalendarDay[];
  pastEditableDays: ConsolidateCalendarDay[];
};

function startOfDayMs(date: Date): number {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value.getTime();
}

function isPastOrToday(date: Date, todayMs: number): boolean {
  return startOfDayMs(date) <= todayMs;
}

export function getAttendanceWeekSummary(
  calendarDays: ConsolidateCalendarDay[]
): AttendanceWeekSummary {
  const todayMs = startOfDayMs(new Date());
  const editableDays = calendarDays.filter((day) =>
    isEditableAttendanceSessionType(day.sessionType)
  );
  const pastEditableDays = editableDays.filter((day) =>
    isPastOrToday(day.date, todayMs)
  );

  return {
    totalWeeks: editableDays.length,
    pastWeeks: pastEditableDays.length,
    editableDays,
    pastEditableDays,
  };
}

export function countStudentAttendance(
  statuses: Array<AttendanceStatus | null | undefined>
): { present: number; absent: number } {
  let present = 0;
  let absent = 0;

  for (const status of statuses) {
    if (!status) continue;
    if (countsAsPresent(status)) present++;
    else if (status === "ABSENT") absent++;
  }

  return { present, absent };
}

export function presentAbsentPercentages(
  present: number,
  absent: number,
  denominator: number
): { presentPct: number; absentPct: number } {
  if (denominator <= 0) {
    return { presentPct: 0, absentPct: 0 };
  }

  return {
    presentPct: calculateAttendancePercentage({
      totalCountableDays: denominator,
      presentOrTardyDays: present,
    }),
    absentPct: calculateAttendancePercentage({
      totalCountableDays: denominator,
      presentOrTardyDays: absent,
    }),
  };
}

export function summarizeStudentAttendance(
  calendarDays: ConsolidateCalendarDay[],
  getStatus: (dayId: string) => AttendanceStatus | null,
  denominator: number,
  dayFilter?: (day: ConsolidateCalendarDay) => boolean
): {
  present: number;
  absent: number;
  presentPct: number;
  absentPct: number;
} {
  const days = dayFilter ? calendarDays.filter(dayFilter) : calendarDays;

  const statuses = days
    .filter((day) => isEditableAttendanceSessionType(day.sessionType))
    .map((day) => getStatus(day.id));

  const { present, absent } = countStudentAttendance(statuses);
  const { presentPct, absentPct } = presentAbsentPercentages(
    present,
    absent,
    denominator
  );

  return { present, absent, presentPct, absentPct };
}
