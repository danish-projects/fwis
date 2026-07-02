import {
  assertStudentIdMatchesSchool,
  normalizeGender,
  normalizeGrade,
  normalizeSection,
  normalizeStudentId,
  studentKey,
} from "./normalize";
import type { RowRecord } from "./read-workbook";

type StudentRegistry = {
  byStudentId: Set<string>;
  byStudentKey: Set<string>;
};

export type StudentReferenceValidationSummary = {
  explicitStudentIds: number;
  autoAssignedStudents: number;
  attendanceByStudentId: number;
  attendanceByLegacy: number;
  assessmentsByStudentId: number;
  assessmentsByLegacy: number;
};

function buildStudentRegistry(students: RowRecord[], cityCode: string): StudentRegistry {
  const byStudentId = new Set<string>();
  const byStudentKey = new Set<string>();

  for (const [index, row] of students.entries()) {
    const rowNum = index + 2;
    const gradeNum = normalizeGrade(row.grade);
    const sectionName = normalizeSection(row.section);
    const gender = normalizeGender(row.gender);
    const key = studentKey(row.first_name, row.last_name, gradeNum, sectionName);

    if (byStudentKey.has(key)) {
      throw new Error(
        `Duplicate student "${row.first_name} ${row.last_name}" (grade ${gradeNum}, ${sectionName}) on Students row ${rowNum}.`
      );
    }
    byStudentKey.add(key);

    const raw = row.student_id?.trim();
    if (!raw) continue;

    const studentId = normalizeStudentId(raw, `Students row ${rowNum} student_id`);
    assertStudentIdMatchesSchool(studentId, cityCode, gender);
    if (byStudentId.has(studentId)) {
      throw new Error(`Duplicate student_id "${studentId}" on Students sheet.`);
    }
    byStudentId.add(studentId);
  }

  return { byStudentId, byStudentKey };
}

function hasLegacyStudentColumns(row: RowRecord): boolean {
  return Boolean(
    row.student_first_name?.trim() &&
      row.student_last_name?.trim() &&
      row.grade?.trim() &&
      row.section?.trim()
  );
}

function validateLinkedRow(
  row: RowRecord,
  sheetName: string,
  rowIndex: number,
  registry: StudentRegistry
): "student_id" | "legacy" {
  const context = `${sheetName} row ${rowIndex + 2}`;
  const rawStudentId = row.student_id?.trim();

  if (rawStudentId) {
    const studentId = normalizeStudentId(rawStudentId, `${context} student_id`);
    if (!registry.byStudentId.has(studentId)) {
      throw new Error(
        `${context}: student_id "${studentId}" is not listed on the Students sheet.`
      );
    }
    return "student_id";
  }

  if (hasLegacyStudentColumns(row)) {
    const gradeNum = normalizeGrade(row.grade);
    const sectionName = normalizeSection(row.section);
    const key = studentKey(
      row.student_first_name,
      row.student_last_name,
      gradeNum,
      sectionName
    );
    if (!registry.byStudentKey.has(key)) {
      throw new Error(
        `${context}: student "${row.student_first_name} ${row.student_last_name}" (grade ${gradeNum}, ${sectionName}) is not listed on the Students sheet.`
      );
    }
    return "legacy";
  }

  throw new Error(
    `${context}: student_id is required (or use legacy student_first_name, student_last_name, grade, and section).`
  );
}

export function validateImportStudentReferences(
  students: RowRecord[],
  attendance: RowRecord[],
  assessments: RowRecord[],
  cityCode: string
): StudentReferenceValidationSummary {
  const registry = buildStudentRegistry(students, cityCode);

  const summary: StudentReferenceValidationSummary = {
    explicitStudentIds: registry.byStudentId.size,
    autoAssignedStudents: students.length - registry.byStudentId.size,
    attendanceByStudentId: 0,
    attendanceByLegacy: 0,
    assessmentsByStudentId: 0,
    assessmentsByLegacy: 0,
  };

  for (const [index, row] of attendance.entries()) {
    const method = validateLinkedRow(row, "Attendance", index, registry);
    if (method === "student_id") summary.attendanceByStudentId++;
    else summary.attendanceByLegacy++;
  }

  for (const [index, row] of assessments.entries()) {
    const method = validateLinkedRow(row, "Assessments", index, registry);
    if (method === "student_id") summary.assessmentsByStudentId++;
    else summary.assessmentsByLegacy++;
  }

  return summary;
}

export function formatStudentReferenceValidation(
  summary: StudentReferenceValidationSummary
): string {
  const lines = [
    "Student ID validation:",
    `  Students with explicit ID: ${summary.explicitStudentIds}`,
    `  Students auto-assigned on import: ${summary.autoAssignedStudents}`,
    `  Attendance linked by student_id: ${summary.attendanceByStudentId}`,
    `  Attendance linked by legacy name: ${summary.attendanceByLegacy}`,
    `  Assessments linked by student_id: ${summary.assessmentsByStudentId}`,
    `  Assessments linked by legacy name: ${summary.assessmentsByLegacy}`,
  ];
  return lines.join("\n");
}
