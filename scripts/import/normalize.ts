import type {
  AssessmentTypeCode,
  AttendanceStatusCode,
  GenderCode,
  SessionTypeCode,
} from "../../prisma/lookup-data";
import {
  isValidStudentNumber,
  parseStudentNumber,
} from "../../src/lib/students/student-number";

const GRADE_ALIASES: Record<string, number> = {
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  grade1: 1,
  grade2: 2,
  grade3: 3,
  grade4: 4,
  grade5: 5,
  grade6: 6,
};

export function normalizeGrade(value: string): number {
  const key = value.trim().toLowerCase().replace(/\s+/g, "");
  const match = key.match(/^grade(\d)$/);
  if (match) return Number(match[1]);
  if (GRADE_ALIASES[key] != null) return GRADE_ALIASES[key];
  throw new Error(`Invalid grade "${value}". Use 1–6 or Grade 1 … Grade 6.`);
}

export function normalizeSection(value: string): "Boys" | "Girls" {
  const key = value.trim().toLowerCase();
  if (key === "boys" || key === "boy" || key === "male") return "Boys";
  if (key === "girls" || key === "girl" || key === "female") return "Girls";
  throw new Error(`Invalid section "${value}". Use Boys or Girls.`);
}

export function normalizeGender(value: string): GenderCode {
  const key = value.trim().toUpperCase();
  if (key === "MALE" || key === "M") return "MALE";
  if (key === "FEMALE" || key === "F") return "FEMALE";
  throw new Error(`Invalid gender "${value}". Use MALE or FEMALE.`);
}

export function normalizeAttendanceStatus(value: string): AttendanceStatusCode {
  const key = value.trim().toUpperCase();
  if (key === "PRESENT" || key === "P") return "PRESENT";
  if (key === "ABSENT" || key === "A") return "ABSENT";
  if (key === "TARDY" || key === "T" || key === "LATE") return "TARDY";
  throw new Error(`Invalid attendance status "${value}". Use Present, Absent, or Tardy.`);
}

export function normalizeSessionType(value: string): SessionTypeCode {
  const key = value.trim().toUpperCase().replace(/\s+/g, "_");
  if (key === "QUIZ") return "QUIZ_1";

  const allowed: SessionTypeCode[] = [
    "INSTRUCTIONAL",
    "QUIZ_1",
    "QUIZ_2",
    "QUIZ_3",
    "QUIZ_4",
    "QUIZ_5",
    "MIDTERM_PROJECT",
    "FINAL_EXAM",
    "PARENT_MEETING",
    "HOLIDAY",
    "GRADUATION",
    "MAKEUP",
  ];
  if (allowed.includes(key as SessionTypeCode)) return key as SessionTypeCode;
  throw new Error(`Invalid session_type "${value}".`);
}

export function parseDate(value: string, label: string): Date {
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!iso) {
    throw new Error(`${label} must be YYYY-MM-DD (got "${value}").`);
  }
  const date = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} is not a valid date (got "${value}").`);
  }
  return date;
}

export function parseOptionalScore(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const score = Number(value);
  if (Number.isNaN(score) || score < 0 || score > 100) {
    throw new Error(`Invalid score "${value}". Use a number from 0 to 100.`);
  }
  return score;
}

export const ASSESSMENT_FIELD_MAP: Array<{ column: string; type: AssessmentTypeCode }> = [
  { column: "quiz_1", type: "QUIZ_1" },
  { column: "quiz_2", type: "QUIZ_2" },
  { column: "quiz_3", type: "QUIZ_3" },
  { column: "quiz_4", type: "QUIZ_4" },
  { column: "quiz_5", type: "QUIZ_5" },
  { column: "midterm_project", type: "MIDTERM_PROJECT" },
  { column: "final_exam", type: "FINAL_EXAM" },
];

export function studentKey(
  firstName: string,
  lastName: string,
  grade: number,
  section: "Boys" | "Girls"
) {
  return `${firstName.trim().toLowerCase()}|${lastName.trim().toLowerCase()}|${grade}|${section}`;
}

export function normalizeStudentId(value: string, label = "student_id"): string {
  const trimmed = value.trim().toUpperCase();
  if (!isValidStudentNumber(trimmed)) {
    throw new Error(
      `Invalid ${label} "${value}". Expected format HOU-B40 (3-letter city code, B or G, sequence).`
    );
  }
  return trimmed;
}

export function assertStudentIdMatchesSchool(
  studentId: string,
  schoolCityCode: string,
  gender: GenderCode
): void {
  const parsed = parseStudentNumber(studentId);
  if (parsed.cityCode !== schoolCityCode.toUpperCase()) {
    throw new Error(
      `student_id "${studentId}" city code ${parsed.cityCode} does not match school city code ${schoolCityCode}.`
    );
  }
  const expected = gender === "FEMALE" ? "G" : "B";
  if (parsed.genderPrefix !== expected) {
    throw new Error(
      `student_id "${studentId}" gender prefix ${parsed.genderPrefix} does not match student gender ${gender}.`
    );
  }
}

export function classroomLabel(grade: number, section: "Boys" | "Girls") {
  return `Grade ${grade} ${section}`;
}
