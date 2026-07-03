import type { AssessmentTypeCode } from "@/lib/setup-types";
import { ASSESSMENT_TYPES } from "@/lib/validations/enrollment";

const ASSESSMENT_TYPE_SET = new Set<string>(ASSESSMENT_TYPES);

/** Display strings for assessment column headers (e.g. "Oct 5, 2025"). */
export type AssessmentColumnDates = Partial<Record<AssessmentTypeCode, string>>;

function formatCalendarDay(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Map calendar session types (QUIZ_1…FINAL_EXAM) to display dates. */
export function buildAssessmentColumnDates(
  days: Array<{ date: Date; sessionType: string }>
): AssessmentColumnDates {
  const dates: AssessmentColumnDates = {};

  for (const day of days) {
    if (!ASSESSMENT_TYPE_SET.has(day.sessionType)) continue;
    const type = day.sessionType as AssessmentTypeCode;
    // Prefer earliest date when a type appears more than once.
    if (!dates[type]) {
      dates[type] = formatCalendarDay(day.date);
    }
  }

  return dates;
}
