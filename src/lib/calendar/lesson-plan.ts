/** Display label for a lesson plan week number (e.g. "Week 1"). */
export function formatLessonPlanLabel(
  lessonPlanNumber: number | null | undefined
): string {
  if (lessonPlanNumber == null) return "—";
  return `Week ${lessonPlanNumber}`;
}

/** Stable session key for attendance-needed calendar days. */
export function lessonPlanSessionKey(
  lessonPlanNumber: number | null | undefined,
  calendarDayId: string
): string {
  return lessonPlanNumber != null ? String(lessonPlanNumber) : calendarDayId;
}
