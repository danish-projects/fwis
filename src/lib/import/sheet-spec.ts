/** Shared column definitions for FWIS school data import/export workbooks. */

/** Sheets used by the import template and importer. */
export const IMPORT_SHEET_NAMES = {
  instructions: "Instructions",
  staff: "Staff",
  students: "Students",
} as const;

/** Full sheet set used by school-year backup export (not imported by roster import). */
export const SHEET_NAMES = {
  ...IMPORT_SHEET_NAMES,
  schoolSetup: "School_Setup",
  attendance: "Attendance",
  assessments: "Assessments",
  calendarOptional: "Calendar_Optional",
} as const;

export type SheetName = (typeof SHEET_NAMES)[keyof typeof SHEET_NAMES];

/** @deprecated Backup only — school/year must already exist for import. */
export const SCHOOL_SETUP_COLUMNS = [
  "school_name",
  "city",
  "state",
  "academic_year",
  "year_start_date",
  "year_end_date",
] as const;

/** Staff roster for import (and Staff rows in backup when academic_year is included). */
export const STAFF_COLUMNS = [
  "school_city",
  "school_state",
  "academic_year",
  "first_name",
  "last_name",
  "email",
  "phone",
  "staff_role",
  "gender",
  "grade",
  "section",
] as const;

/**
 * Backup Staff sheet includes linked login for reference.
 * Import derives user_id from school code + grade/section (or gender for Substitute).
 */
export const BACKUP_STAFF_COLUMNS = [
  ...STAFF_COLUMNS,
  "user_id",
] as const;

/** @deprecated Use STAFF_COLUMNS */
export const TEACHER_COLUMNS = STAFF_COLUMNS;

/** Older workbooks without login / staff_role / academic_year. */
export const STAFF_LEGACY_COLUMNS = [
  "school_city",
  "school_state",
  "first_name",
  "last_name",
  "email",
  "phone",
  "grade",
  "section",
] as const;

/** @deprecated Use STAFF_LEGACY_COLUMNS */
export const TEACHER_LEGACY_COLUMNS = STAFF_LEGACY_COLUMNS;

export const STUDENT_COLUMNS = [
  "school_city",
  "school_state",
  "academic_year",
  "student_id",
  "first_name",
  "last_name",
  "gender",
  "email_address",
  "grade",
  "section",
  "street_address",
  "city",
  "state_province",
  "zip_postal_code",
  "country",
  "father_guardian_first_name",
  "father_guardian_last_name",
  "father_parental_responsibility",
  "father_mobile_whatsapp_number",
  "mother_guardian_first_name",
  "mother_guardian_last_name",
  "mother_parental_responsibility",
  "mother_mobile_whatsapp_number",
  "enrollment_date",
] as const;

/** Kept for backup export only — not part of roster import. */
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
  "lesson_plan_number",
] as const;

/** @deprecated Legacy template column — still accepted on backup-shaped files only */
export const CALENDAR_LEGACY_COLUMNS = [
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

/**
 * Workbook sheets that must not appear in a roster import file.
 * Import template is Instructions + Staff + Students only.
 */
export const FORBIDDEN_IMPORT_SHEETS = [
  SHEET_NAMES.schoolSetup,
  "Teachers", // legacy roster sheet name — use Staff
  SHEET_NAMES.attendance,
  SHEET_NAMES.assessments,
  SHEET_NAMES.calendarOptional,
] as const;
