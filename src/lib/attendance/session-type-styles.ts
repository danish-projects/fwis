import type { SessionType } from "@/lib/setup-types";
import { QUIZ_SESSION_TYPE_CODES } from "@/lib/setup-types";
import { ATTENDANCE_MARKABLE_SESSION_TYPES } from "@/lib/grades/attendance-percentage";

const QUIZ_HEADER_CLASS =
  "bg-blue-600 text-white dark:bg-blue-700 dark:text-blue-50";

const QUIZ_CELL_CLASS =
  "bg-blue-100 text-blue-950 dark:bg-blue-950 dark:text-blue-100";

export const SESSION_TYPE_HEADER_CLASSES: Record<SessionType, string> = {
  INSTRUCTIONAL:
    "bg-slate-700 text-white dark:bg-slate-600 dark:text-slate-50",
  ...Object.fromEntries(
    QUIZ_SESSION_TYPE_CODES.map((code) => [code, QUIZ_HEADER_CLASS])
  ) as Record<(typeof QUIZ_SESSION_TYPE_CODES)[number], string>,
  MIDTERM_PROJECT:
    "bg-purple-700 text-white dark:bg-purple-800 dark:text-purple-50",
  FINAL_EXAM: "bg-red-700 text-white dark:bg-red-900 dark:text-red-50",
  PARENT_MEETING:
    "bg-orange-700 text-white dark:bg-orange-900 dark:text-orange-50",
  HOLIDAY: "bg-zinc-600 text-white dark:bg-zinc-700 dark:text-zinc-100",
  GRADUATION:
    "bg-amber-700 text-white dark:bg-amber-900 dark:text-amber-50",
  MAKEUP: "bg-emerald-700 text-white dark:bg-emerald-900 dark:text-emerald-50",
};

/** Higher-contrast cell backgrounds for attendance matrix tables. */
export const SESSION_TYPE_CELL_CLASSES: Record<SessionType, string> = {
  INSTRUCTIONAL:
    "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
  ...Object.fromEntries(
    QUIZ_SESSION_TYPE_CODES.map((code) => [code, QUIZ_CELL_CLASS])
  ) as Record<(typeof QUIZ_SESSION_TYPE_CODES)[number], string>,
  MIDTERM_PROJECT:
    "bg-purple-100 text-purple-950 dark:bg-purple-950 dark:text-purple-100",
  FINAL_EXAM: "bg-red-100 text-red-950 dark:bg-red-950 dark:text-red-100",
  PARENT_MEETING:
    "bg-orange-100 text-orange-950 dark:bg-orange-950 dark:text-orange-100",
  HOLIDAY: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  GRADUATION:
    "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100",
  MAKEUP:
    "bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100",
};

export function isEditableAttendanceSessionType(sessionType: SessionType): boolean {
  return isMarkableSessionType(sessionType);
}

export function isMarkableSessionType(sessionType: SessionType): boolean {
  return ATTENDANCE_MARKABLE_SESSION_TYPES.includes(sessionType);
}
