import {
  normalizeGrade,
  normalizeSection,
  normalizeStudentId,
  studentKey,
} from "./normalize";
import type { RowRecord } from "./read-workbook";

export type EnrollmentMaps = {
  byStudentId: Map<string, string>;
  byStudentKey: Map<string, string>;
};

export function resolveEnrollmentId(
  maps: EnrollmentMaps,
  row: RowRecord,
  context: string
): string {
  if (row.student_id?.trim()) {
    const studentId = normalizeStudentId(row.student_id);
    const enrollmentId = maps.byStudentId.get(studentId);
    if (!enrollmentId) {
      throw new Error(`${context}: unknown student_id "${studentId}"`);
    }
    return enrollmentId;
  }

  const hasLegacy =
    row.student_first_name?.trim() &&
    row.student_last_name?.trim() &&
    row.grade?.trim() &&
    row.section?.trim();

  if (hasLegacy) {
    const gradeNum = normalizeGrade(row.grade);
    const sectionName = normalizeSection(row.section);
    const key = studentKey(
      row.student_first_name,
      row.student_last_name,
      gradeNum,
      sectionName
    );
    const enrollmentId = maps.byStudentKey.get(key);
    if (!enrollmentId) {
      throw new Error(
        `${context}: unknown student ${row.student_first_name} ${row.student_last_name}`
      );
    }
    return enrollmentId;
  }

  throw new Error(
    `${context}: provide student_id or legacy student_first_name, student_last_name, grade, and section`
  );
}
