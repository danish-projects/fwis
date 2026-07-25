import type { SessionTypeCode } from "../../prisma/lookup-data";
import { calendarDateKey } from "../../src/lib/calendar/calendar-date";
import {
  defaultSessionTypeForSunday,
  generateSundays,
} from "../../src/lib/calendar/generate-sundays";
import { isAttendanceNeeded } from "../../src/lib/grades/attendance-percentage";
import {
  ASSESSMENT_FIELD_MAP,
  normalizeGrade,
  normalizeSection,
  normalizeSessionType,
  parseDate,
  studentKey,
} from "./normalize";
import type { RowRecord } from "./read-workbook";

const ASSESSMENT_SESSION_TYPES = new Set<SessionTypeCode>([
  "QUIZ_1",
  "QUIZ_2",
  "QUIZ_3",
  "QUIZ_4",
  "QUIZ_5",
  "MIDTERM_PROJECT",
  "FINAL_EXAM",
]);

const SESSION_TYPE_LABELS: Partial<Record<SessionTypeCode, string>> = {
  QUIZ_1: "Quiz 1",
  QUIZ_2: "Quiz 2",
  QUIZ_3: "Quiz 3",
  QUIZ_4: "Quiz 4",
  QUIZ_5: "Quiz 5",
  MIDTERM_PROJECT: "Midterm Project",
  FINAL_EXAM: "Final Exam",
  HOLIDAY: "Holiday",
  PARENT_MEETING: "Parent Meeting",
  GRADUATION: "Graduation",
};

export type CalendarValidationSummary = {
  sundayCount: number;
  calendarOverrides: number;
  holidayCount: number;
  quizDayCounts: Record<string, number>;
  finalExamDays: number;
  midtermDays: number;
  calendarAssessmentColumns: string[];
  attendanceOnBlockedDays: number;
};

function dateKey(date: Date): string {
  return calendarDateKey(date);
}

function assertSunday(date: Date, context: string): void {
  if (date.getUTCDay() !== 0) {
    throw new Error(`${context}: date ${dateKey(date)} must be a Sunday.`);
  }
}

function assessmentColumnForSession(sessionType: SessionTypeCode): string | null {
  if (!ASSESSMENT_SESSION_TYPES.has(sessionType)) return null;
  return ASSESSMENT_FIELD_MAP.find((field) => field.type === sessionType)?.column ?? null;
}

function formatStudentLabel(row: RowRecord): string {
  if (row.student_id?.trim()) return row.student_id.trim().toUpperCase();
  if (row.student_first_name?.trim() && row.student_last_name?.trim()) {
    return `${row.student_first_name.trim()} ${row.student_last_name.trim()}`;
  }
  if (row.first_name?.trim() && row.last_name?.trim()) {
    return `${row.first_name.trim()} ${row.last_name.trim()}`;
  }
  return "unknown student";
}

function studentMatchKey(row: RowRecord): string | null {
  if (row.student_id?.trim()) {
    return `id:${row.student_id.trim().toUpperCase()}`;
  }
  const firstName = row.student_first_name?.trim() || row.first_name?.trim();
  const lastName = row.student_last_name?.trim() || row.last_name?.trim();
  if (!firstName || !lastName || !row.grade?.trim() || !row.section?.trim()) {
    return null;
  }
  const gradeNum = normalizeGrade(row.grade);
  const sectionName = normalizeSection(row.section);
  return `key:${studentKey(firstName, lastName, gradeNum, sectionName)}`;
}

export function buildImportCalendar(
  yearStart: Date,
  yearEnd: Date,
  calendarOptional: RowRecord[]
): Map<string, SessionTypeCode> {
  const sundays = generateSundays(yearStart, yearEnd);
  const calendar = new Map<string, SessionTypeCode>();

  sundays.forEach((date, index) => {
    calendar.set(
      dateKey(date),
      defaultSessionTypeForSunday(index + 1, sundays.length, {
        sundayDateKeys: sundays.map((d) => dateKey(d)),
      })
    );
  });

  const seenOverrideDates = new Set<string>();

  for (const [index, row] of calendarOptional.entries()) {
    const rowNum = index + 2;
    const date = parseDate(row.date, `Calendar_Optional row ${rowNum} date`);
    assertSunday(date, `Calendar_Optional row ${rowNum}`);
    const key = dateKey(date);

    if (!calendar.has(key)) {
      throw new Error(
        `Calendar_Optional row ${rowNum}: date ${key} is not a Sunday within the academic year (${dateKey(yearStart)} to ${dateKey(yearEnd)}).`
      );
    }

    if (seenOverrideDates.has(key)) {
      throw new Error(`Calendar_Optional row ${rowNum}: duplicate date ${key}.`);
    }
    seenOverrideDates.add(key);

    calendar.set(key, normalizeSessionType(row.session_type || "INSTRUCTIONAL"));
  }

  return calendar;
}

function getCalendarAssessmentColumns(
  calendar: Map<string, SessionTypeCode>
): string[] {
  const columns = new Set<string>();
  for (const sessionType of calendar.values()) {
    const column = assessmentColumnForSession(sessionType);
    if (column) columns.add(column);
  }
  return [...columns].sort();
}

function indexAssessmentRows(assessments: RowRecord[]): Map<string, RowRecord> {
  const byKey = new Map<string, RowRecord>();
  for (const [index, row] of assessments.entries()) {
    const key = studentMatchKey(row);
    if (!key) {
      throw new Error(
        `Assessments row ${index + 2}: cannot identify student (provide student_id or name/grade/section).`
      );
    }
    if (byKey.has(key)) {
      throw new Error(
        `Assessments row ${index + 2}: duplicate assessment row for ${formatStudentLabel(row)}.`
      );
    }
    byKey.set(key, row);
  }
  return byKey;
}

export function validateImportCalendar(
  yearStart: Date,
  yearEnd: Date,
  calendarOptional: RowRecord[],
  attendance: RowRecord[],
  assessments: RowRecord[]
): CalendarValidationSummary {
  const calendar = buildImportCalendar(yearStart, yearEnd, calendarOptional);
  const calendarAssessmentColumns = getCalendarAssessmentColumns(calendar);

  indexAssessmentRows(assessments);

  let attendanceOnBlockedDays = 0;

  for (const [index, row] of attendance.entries()) {
    const rowNum = index + 2;
    const date = parseDate(row.date, `Attendance row ${rowNum} date`);
    assertSunday(date, `Attendance row ${rowNum}`);
    const key = dateKey(date);
    const sessionType = calendar.get(key);

    if (!sessionType) {
      throw new Error(
        `Attendance row ${rowNum}: date ${key} is not a calendar Sunday in the academic year.`
      );
    }

    if (!isAttendanceNeeded(sessionType)) {
      attendanceOnBlockedDays++;
      const label = SESSION_TYPE_LABELS[sessionType] ?? sessionType;
      throw new Error(
        `Attendance row ${rowNum}: cannot record attendance on ${key} (${label}). Holidays and other non-instructional days do not accept attendance.`
      );
    }
  }

  const quizDayCounts: Record<string, number> = {};
  let holidayCount = 0;
  let finalExamDays = 0;
  let midtermDays = 0;

  for (const sessionType of calendar.values()) {
    if (sessionType === "HOLIDAY") holidayCount++;
    if (sessionType === "FINAL_EXAM") finalExamDays++;
    if (sessionType === "MIDTERM_PROJECT") midtermDays++;
    if (sessionType.startsWith("QUIZ_")) {
      quizDayCounts[sessionType] = (quizDayCounts[sessionType] ?? 0) + 1;
    }
  }

  return {
    sundayCount: calendar.size,
    calendarOverrides: calendarOptional.length,
    holidayCount,
    quizDayCounts,
    finalExamDays,
    midtermDays,
    calendarAssessmentColumns,
    attendanceOnBlockedDays,
  };
}

export function formatCalendarValidation(summary: CalendarValidationSummary): string {
  const quizSummary =
    Object.keys(summary.quizDayCounts).length > 0
      ? Object.entries(summary.quizDayCounts)
          .map(([type, count]) => `${type} (${count})`)
          .join(", ")
      : "none";

  const calendarAssessments =
    summary.calendarAssessmentColumns.length > 0
      ? summary.calendarAssessmentColumns.join(", ")
      : "none";

  return [
    "Calendar validation:",
    `  Sundays in academic year: ${summary.sundayCount}`,
    `  Calendar overrides: ${summary.calendarOverrides}`,
    `  Holidays: ${summary.holidayCount}`,
    `  Quiz days: ${quizSummary}`,
    `  Midterm project days: ${summary.midtermDays}`,
    `  Final exam days: ${summary.finalExamDays}`,
    `  Calendar assessment columns: ${calendarAssessments} (scores optional per student)`,
  ].join("\n");
}
