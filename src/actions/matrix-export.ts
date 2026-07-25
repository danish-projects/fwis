"use server";

import { getGradeAttendanceMatrix } from "@/actions/attendance";
import { getAssessmentMatrix } from "@/actions/assessments";
import { createAuditLog } from "@/lib/audit/create-audit-log";
import { getSessionUser } from "@/lib/auth/session";
import { toExcel } from "@/lib/export";
import { buildAssessmentMatrixExportRows } from "@/lib/export/build-assessment-matrix-export";
import {
  buildAttendanceMatrixExportRows,
  slugifyExportName,
} from "@/lib/export/build-attendance-matrix-export";
import { assessmentMatrixExportSchema } from "@/lib/validations/assessment-export";
import { attendanceMatrixExportSchema } from "@/lib/validations/attendance-export";

const ALL_CLASSROOMS = "all";

export async function buildAttendanceMatrixExportBuffer(rawParams: {
  schoolId: string;
  classroom?: string;
}) {
  const params = attendanceMatrixExportSchema.parse(rawParams);
  const classroomFilter =
    !params.classroom || params.classroom === ALL_CLASSROOMS
      ? ALL_CLASSROOMS
      : params.classroom;

  const matrix = await getGradeAttendanceMatrix(
    params.schoolId,
    classroomFilter === ALL_CLASSROOMS
      ? {}
      : { classroomId: classroomFilter }
  );

  if (!matrix || matrix.calendarDays.length === 0 || matrix.students.length === 0) {
    throw new Error("No attendance data to export");
  }

  const rows = buildAttendanceMatrixExportRows({
    calendarDays: matrix.calendarDays,
    students: matrix.students,
    showGradeColumn: classroomFilter === ALL_CLASSROOMS,
  });

  const buffer = await toExcel(rows, "Attendance");

  const schoolSlug = slugifyExportName(matrix.school.name);
  const scopeSlug =
    classroomFilter === ALL_CLASSROOMS
      ? "all-grades"
      : slugifyExportName(matrix.classroom?.name ?? "classroom");
  const yearSlug = matrix.academicYear
    ? slugifyExportName(matrix.academicYear.name)
    : "year";
  const filename = `attendance-${schoolSlug}-${scopeSlug}-${yearSlug}`;

  const user = await getSessionUser();
  await createAuditLog({
    userId: user?.id,
    schoolId: params.schoolId,
    entity: "Attendance",
    action: "EXPORT",
    newValues: {
      schoolId: params.schoolId,
      classroom: classroomFilter,
      rowCount: rows.length,
    },
  });

  return { buffer, filename };
}

export async function buildAssessmentMatrixExportBuffer(rawParams: {
  classroomId: string;
  year?: string;
}) {
  const params = assessmentMatrixExportSchema.parse(rawParams);
  const matrix = await getAssessmentMatrix(params.classroomId, params.year);

  if (!matrix || matrix.rows.length === 0) {
    throw new Error("No assessment data to export");
  }

  const rows = buildAssessmentMatrixExportRows(matrix.rows);
  const buffer = await toExcel(rows, "Assessments");

  const classroomSlug = slugifyExportName(matrix.classroom.name);
  const yearSlug = matrix.academicYear
    ? slugifyExportName(matrix.academicYear.name)
    : "year";
  const filename = `assessments-${classroomSlug}-${yearSlug}`;

  const user = await getSessionUser();
  await createAuditLog({
    userId: user?.id,
    schoolId: matrix.classroom.schoolId,
    entity: "Assessment",
    action: "EXPORT",
    newValues: {
      classroomId: params.classroomId,
      yearId: params.year ?? matrix.academicYear?.id ?? null,
      rowCount: rows.length,
    },
  });

  return { buffer, filename };
}
