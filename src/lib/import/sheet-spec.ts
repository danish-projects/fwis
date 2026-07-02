/** Shared column definitions for FWIS school data import/export workbooks. */

export const SHEET_NAMES = {
  instructions: "Instructions",
  schoolSetup: "School_Setup",
  teachers: "Teachers",
  students: "Students",
  attendance: "Attendance",
  assessments: "Assessments",
  calendarOptional: "Calendar_Optional",
} as const;

export type SheetName = (typeof SHEET_NAMES)[keyof typeof SHEET_NAMES];

export const SCHOOL_SETUP_COLUMNS = [
  "school_name",
  "city",
  "state",
  "academic_year",
  "year_start_date",
  "year_end_date",
] as const;

export const TEACHER_COLUMNS = [
  "school_city",
  "school_state",
  "first_name",
  "last_name",
  "email",
  "phone",
  "grade",
  "section",
] as const;

export const STUDENT_COLUMNS = [
  "school_city",
  "school_state",
  "academic_year",
  "student_id",
  "first_name",
  "last_name",
  "gender",
  "grade",
  "section",
  "teacher_email",
  "parent_name",
  "parent_phone",
  "parent_email",
  "enrollment_date",
] as const;

export const ATTENDANCE_COLUMNS = [
  "school_city",
  "school_state",
  "academic_year",
  "student_id",
  "date",
  "status",
] as const;

export const ASSESSMENT_COLUMNS = [
  "school_city",
  "school_state",
  "academic_year",
  "student_id",
  "quiz_1",
  "quiz_2",
  "quiz_3",
  "quiz_4",
  "quiz_5",
  "midterm_project",
  "final_exam",
] as const;

export const CALENDAR_COLUMNS = [
  "date",
  "session_type",
  "sunday_number",
] as const;

export const ASSESSMENT_COLUMN_BY_TYPE: Record<string, string> = {
  QUIZ_1: "quiz_1",
  QUIZ_2: "quiz_2",
  QUIZ_3: "quiz_3",
  QUIZ_4: "quiz_4",
  QUIZ_5: "quiz_5",
  MIDTERM_PROJECT: "midterm_project",
  FINAL_EXAM: "final_exam",
};
