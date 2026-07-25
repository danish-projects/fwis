import {
  assertStudentIdMatchesSchool,
  normalizeGender,
  normalizeGrade,
  normalizeSection,
  normalizeStudentId,
  studentKey,
} from "./normalize";
import type { RowRecord } from "./read-workbook";

export type StudentReferenceValidationSummary = {
  explicitStudentIds: number;
  autoAssignedStudents: number;
};

function buildStudentRegistry(students: RowRecord[], cityCode: string) {
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

export function validateImportStudents(
  students: RowRecord[],
  cityCode: string
): StudentReferenceValidationSummary {
  const registry = buildStudentRegistry(students, cityCode);
  return {
    explicitStudentIds: registry.byStudentId.size,
    autoAssignedStudents: students.length - registry.byStudentId.size,
  };
}

/** @deprecated Use validateImportStudents */
export function validateImportStudentReferences(
  students: RowRecord[],
  _attendance: RowRecord[],
  _assessments: RowRecord[],
  cityCode: string
): StudentReferenceValidationSummary {
  return validateImportStudents(students, cityCode);
}

export function formatStudentReferenceValidation(
  summary: StudentReferenceValidationSummary
): string {
  return [
    "Student ID validation:",
    `  Students with explicit ID: ${summary.explicitStudentIds}`,
    `  Students auto-assigned on import: ${summary.autoAssignedStudents}`,
  ].join("\n");
}
