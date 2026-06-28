/** Canonical codes for FWIS setup / lookup tables. */

export const GENDER_CODES = ["MALE", "FEMALE"] as const;
export type GenderCode = (typeof GENDER_CODES)[number];

export const ENROLLMENT_STATUS_CODES = [
  "ACTIVE",
  "WITHDRAWN",
  "GRADUATED",
  "PROMOTED",
] as const;
export type EnrollmentStatusCode = (typeof ENROLLMENT_STATUS_CODES)[number];

export const ATTENDANCE_STATUS_CODES = ["PRESENT", "ABSENT", "TARDY"] as const;
export type AttendanceStatusCode = (typeof ATTENDANCE_STATUS_CODES)[number];

export const BEHAVIOR_RATING_CODES = [
  "OUTSTANDING",
  "EXCELLENT",
  "VERY_GOOD",
  "MEETS_EXPECTATIONS",
  "NEEDS_IMPROVEMENT",
  "UNSATISFACTORY",
] as const;
export type BehaviorRatingCode = (typeof BEHAVIOR_RATING_CODES)[number];

/** @deprecated Use BEHAVIOR_RATING_CODES */
export const BEHAVIOR_VALUE_CODES = BEHAVIOR_RATING_CODES;
/** @deprecated Use BehaviorRatingCode */
export type BehaviorValueCode = BehaviorRatingCode;

export const QUIZ_SESSION_TYPE_CODES = [
  "QUIZ_1",
  "QUIZ_2",
  "QUIZ_3",
  "QUIZ_4",
  "QUIZ_5",
] as const;
export type QuizSessionTypeCode = (typeof QUIZ_SESSION_TYPE_CODES)[number];

export const SESSION_TYPE_CODES = [
  "INSTRUCTIONAL",
  ...QUIZ_SESSION_TYPE_CODES,
  "MIDTERM_PROJECT",
  "FINAL_EXAM",
  "PARENT_MEETING",
  "HOLIDAY",
  "GRADUATION",
  "MAKEUP",
] as const;
export type SessionTypeCode = (typeof SESSION_TYPE_CODES)[number];

export const ASSESSMENT_TYPE_CODES = [
  "QUIZ_1",
  "QUIZ_2",
  "QUIZ_3",
  "QUIZ_4",
  "QUIZ_5",
  "MIDTERM_PROJECT",
  "FINAL_EXAM",
] as const;
export type AssessmentTypeCode = (typeof ASSESSMENT_TYPE_CODES)[number];

export const GRADE_ROWS = [
  { name: "Grade 1", sortOrder: 1 },
  { name: "Grade 2", sortOrder: 2 },
  { name: "Grade 3", sortOrder: 3 },
  { name: "Grade 4", sortOrder: 4 },
  { name: "Grade 5", sortOrder: 5 },
  { name: "Grade 6", sortOrder: 6 },
] as const;

export const SECTION_NAMES = ["Boys", "Girls"] as const;

export const GENDER_ROWS: Array<{ code: GenderCode; label: string }> = [
  { code: "MALE", label: "Male" },
  { code: "FEMALE", label: "Female" },
];

export const ENROLLMENT_STATUS_ROWS: Array<{
  code: EnrollmentStatusCode;
  label: string;
}> = [
  { code: "ACTIVE", label: "Active" },
  { code: "WITHDRAWN", label: "Withdrawn" },
  { code: "GRADUATED", label: "Graduated" },
  { code: "PROMOTED", label: "Promoted" },
];

export const ATTENDANCE_STATUS_ROWS: Array<{
  code: AttendanceStatusCode;
  label: string;
}> = [
  { code: "PRESENT", label: "Present" },
  { code: "ABSENT", label: "Absent" },
  { code: "TARDY", label: "Tardy" },
];

export const BEHAVIOR_RATING_ROWS: Array<{
  code: BehaviorRatingCode;
  label: string;
  sortOrder: number;
}> = [
  { code: "OUTSTANDING", label: "Outstanding", sortOrder: 1 },
  { code: "EXCELLENT", label: "Excellent", sortOrder: 2 },
  { code: "VERY_GOOD", label: "Very Good", sortOrder: 3 },
  { code: "MEETS_EXPECTATIONS", label: "Meets Expectations", sortOrder: 4 },
  { code: "NEEDS_IMPROVEMENT", label: "Needs Improvement", sortOrder: 5 },
  { code: "UNSATISFACTORY", label: "Unsatisfactory", sortOrder: 6 },
];

/** @deprecated Use BEHAVIOR_RATING_ROWS */
export const BEHAVIOR_VALUE_ROWS = BEHAVIOR_RATING_ROWS;

export const SESSION_TYPE_ROWS: Array<{
  code: SessionTypeCode;
  label: string;
  sortOrder: number;
}> = [
  { code: "INSTRUCTIONAL", label: "Instructional", sortOrder: 1 },
  { code: "QUIZ_1", label: "Quiz 1", sortOrder: 2 },
  { code: "QUIZ_2", label: "Quiz 2", sortOrder: 3 },
  { code: "QUIZ_3", label: "Quiz 3", sortOrder: 4 },
  { code: "QUIZ_4", label: "Quiz 4", sortOrder: 5 },
  { code: "QUIZ_5", label: "Quiz 5", sortOrder: 6 },
  { code: "MIDTERM_PROJECT", label: "Midterm Project", sortOrder: 7 },
  { code: "FINAL_EXAM", label: "Final Exam", sortOrder: 8 },
  { code: "PARENT_MEETING", label: "Parent Meeting", sortOrder: 9 },
  { code: "HOLIDAY", label: "Holiday", sortOrder: 10 },
  { code: "GRADUATION", label: "Graduation", sortOrder: 11 },
  { code: "MAKEUP", label: "Makeup", sortOrder: 12 },
];

export const ASSESSMENT_TYPE_ROWS: Array<{
  code: AssessmentTypeCode;
  label: string;
  sortOrder: number;
}> = [
  { code: "QUIZ_1", label: "Quiz 1", sortOrder: 1 },
  { code: "QUIZ_2", label: "Quiz 2", sortOrder: 2 },
  { code: "QUIZ_3", label: "Quiz 3", sortOrder: 3 },
  { code: "QUIZ_4", label: "Quiz 4", sortOrder: 4 },
  { code: "QUIZ_5", label: "Quiz 5", sortOrder: 5 },
  { code: "MIDTERM_PROJECT", label: "Midterm Project", sortOrder: 6 },
  { code: "FINAL_EXAM", label: "Final Exam", sortOrder: 7 },
];
