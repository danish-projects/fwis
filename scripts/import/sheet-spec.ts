/** Shared column definitions for the FWIS school data import template. */

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
  "student_first_name",
  "student_last_name",
  "grade",
  "section",
  "date",
  "status",
] as const;

export const ASSESSMENT_COLUMNS = [
  "school_city",
  "school_state",
  "academic_year",
  "student_first_name",
  "student_last_name",
  "grade",
  "section",
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

export const INSTRUCTIONS_LINES = [
  "FWIS School Data Import Template",
  "",
  "Fill one workbook per school per academic year, then run:",
  "  npm run import:school -- --file path/to/file.xlsx --dry-run",
  "  npm run import:school -- --file path/to/file.xlsx",
  "",
  "Sheet order (do not rename sheets):",
  "  1. School_Setup     — one row: school + academic year dates",
  "  2. Teachers         — one row per teacher (one grade/section each)",
  "  3. Students         — one row per enrolled student",
  "  4. Attendance       — one row per student per Sunday",
  "  5. Assessments      — one row per student (quiz & exam scores)",
  "  6. Calendar_Optional — only if you need non-default session types",
  "",
  "Rules:",
  "  • One workbook = one school + one academic year (see School_Setup)",
  "  • school_city + school_state on every sheet must match School_Setup",
  "  • academic_year on Students/Attendance/Assessments must match School_Setup",
  "  • grade: 1–6 or Grade 1 … Grade 6 on Teachers, Students, Attendance, Assessments",
  "  • section: Boys or Girls (exact capitalization recommended)",
  "  • Attendance/Assessments: grade + section must match the Students row for that child",
  "  • gender: MALE or FEMALE (MALE→Boys, FEMALE→Girls)",
  "  • teacher_email (Students) must match email on Teachers sheet exactly",
  "  • attendance date: YYYY-MM-DD, must be a Sunday in the academic year",
  "  • status: Present, Absent, or Tardy",
  "  • assessment scores: 0–100; leave blank if not taken",
  "  • See docs/DATA_IMPORT.md for foreign keys and exact match values",
  "  • Delete all example rows before importing real data",
  "",
  "Example rows are provided on each sheet — replace with your school data.",
];

export const EXAMPLE_SCHOOL_SETUP = {
  school_name: "Faizan Weekend School Houston",
  city: "Houston",
  state: "TX",
  academic_year: "2024-2025",
  year_start_date: "2024-09-08",
  year_end_date: "2025-05-25",
};

export const EXAMPLE_TEACHERS = [
  {
    school_city: "Houston",
    school_state: "TX",
    first_name: "Muhammad",
    last_name: "Usman Khan",
    email: "grade1.boys.houston@fwis.org",
    phone: "555-3001",
    grade: "1",
    section: "Boys",
  },
  {
    school_city: "Houston",
    school_state: "TX",
    first_name: "Fatima",
    last_name: "Ali Khan",
    email: "grade1.girls.houston@fwis.org",
    phone: "555-3002",
    grade: "1",
    section: "Girls",
  },
];

export const EXAMPLE_STUDENTS = [
  {
    school_city: "Houston",
    school_state: "TX",
    academic_year: "2024-2025",
    first_name: "Ahmed",
    last_name: "Khan",
    gender: "MALE",
    grade: "1",
    section: "Boys",
    teacher_email: "grade1.boys.houston@fwis.org",
    parent_name: "Khan Parent",
    parent_phone: "555-1001",
    parent_email: "parent.khan@email.com",
    enrollment_date: "2024-09-08",
  },
  {
    school_city: "Houston",
    school_state: "TX",
    academic_year: "2024-2025",
    first_name: "Aisha",
    last_name: "Ali",
    gender: "FEMALE",
    grade: "1",
    section: "Girls",
    teacher_email: "grade1.girls.houston@fwis.org",
    parent_name: "Ali Parent",
    parent_phone: "555-1002",
    parent_email: "parent.ali@email.com",
    enrollment_date: "2024-09-08",
  },
];

export const EXAMPLE_ATTENDANCE = [
  {
    school_city: "Houston",
    school_state: "TX",
    academic_year: "2024-2025",
    student_first_name: "Ahmed",
    student_last_name: "Khan",
    grade: "1",
    section: "Boys",
    date: "2024-09-08",
    status: "Present",
  },
  {
    school_city: "Houston",
    school_state: "TX",
    academic_year: "2024-2025",
    student_first_name: "Ahmed",
    student_last_name: "Khan",
    grade: "1",
    section: "Boys",
    date: "2024-09-15",
    status: "Present",
  },
  {
    school_city: "Houston",
    school_state: "TX",
    academic_year: "2024-2025",
    student_first_name: "Aisha",
    student_last_name: "Ali",
    grade: "1",
    section: "Girls",
    date: "2024-09-08",
    status: "Absent",
  },
];

export const EXAMPLE_ASSESSMENTS = [
  {
    school_city: "Houston",
    school_state: "TX",
    academic_year: "2024-2025",
    student_first_name: "Ahmed",
    student_last_name: "Khan",
    grade: "1",
    section: "Boys",
    quiz_1: "92",
    quiz_2: "88",
    quiz_3: "90",
    quiz_4: "85",
    quiz_5: "91",
    midterm_project: "87",
    final_exam: "93",
  },
  {
    school_city: "Houston",
    school_state: "TX",
    academic_year: "2024-2025",
    student_first_name: "Aisha",
    student_last_name: "Ali",
    grade: "1",
    section: "Girls",
    quiz_1: "95",
    quiz_2: "94",
    quiz_3: "96",
    quiz_4: "92",
    quiz_5: "97",
    midterm_project: "90",
    final_exam: "94",
  },
];

export const EXAMPLE_CALENDAR = [
  {
    date: "2024-09-08",
    session_type: "INSTRUCTIONAL",
    sunday_number: "1",
  },
  {
    date: "2024-09-15",
    session_type: "INSTRUCTIONAL",
    sunday_number: "2",
  },
  {
    date: "2024-10-06",
    session_type: "QUIZ_1",
    sunday_number: "5",
  },
];
