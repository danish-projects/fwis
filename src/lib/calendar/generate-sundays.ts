import type { SessionTypeCode } from "@/lib/setup-types";

export function generateSundays(start: Date, end: Date): Date[] {
  const sundays: Date[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);

  while (current.getDay() !== 0) {
    current.setDate(current.getDate() + 1);
  }

  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);

  while (current <= endDate) {
    sundays.push(new Date(current));
    current.setDate(current.getDate() + 7);
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

/** Default session type when auto-generating calendar Sundays (demo / bootstrap). */
export function defaultSessionTypeForSunday(sundaySequenceNumber: number): SessionTypeCode {
  if (sundaySequenceNumber % 8 !== 0) return "INSTRUCTIONAL";
  const quizIndex = Math.min(Math.floor(sundaySequenceNumber / 8), 5);
  return `QUIZ_${quizIndex}` as SessionTypeCode;
}

export function isInstructionalDay(sessionType: SessionTypeCode): boolean {
  return !["HOLIDAY", "PARENT_MEETING", "GRADUATION"].includes(sessionType);
}
