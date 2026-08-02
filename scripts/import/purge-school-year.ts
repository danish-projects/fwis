import type { PrismaClient } from "@prisma/client";

/**
 * Roster-only counts for Staff + Students import re-run.
 * Does not include academic year, calendar, holidays, classrooms, or app users.
 */
export type SchoolYearDataCounts = {
  staffAssignments: number;
  staffRemoved: number;
  enrollments: number;
  attendance: number;
  assessments: number;
  finalGrades: number;
  orphanStudentsRemoved: number;
};

export async function getSchoolYearEnrollmentIds(
  prisma: PrismaClient,
  schoolId: string,
  academicYearSchoolId: string
) {
  const link = await prisma.academicYearSchool.findFirst({
    where: { id: academicYearSchoolId, schoolId, deletedAt: null },
    select: { id: true },
  });
  if (!link) {
    throw new Error(
      "Academic year school link does not belong to the specified school — aborting to protect other schools."
    );
  }

  return prisma.studentEnrollment.findMany({
    where: { schoolId, academicYearSchoolId, deletedAt: null },
    select: { id: true, studentId: true },
  });
}

export async function countSchoolYearImportData(
  prisma: PrismaClient,
  schoolId: string,
  academicYearSchoolId: string
): Promise<SchoolYearDataCounts> {
  const enrollments = await getSchoolYearEnrollmentIds(
    prisma,
    schoolId,
    academicYearSchoolId
  );
  const enrollmentIds = enrollments.map((e) => e.id);

  const [staffAssignments, attendance, assessments, finalGrades] =
    await Promise.all([
      prisma.staffAssignment.count({
        where: { academicYearSchoolId },
      }),
      enrollmentIds.length > 0
        ? prisma.attendance.count({
            where: { enrollmentId: { in: enrollmentIds }, deletedAt: null },
          })
        : 0,
      enrollmentIds.length > 0
        ? prisma.assessmentScore.count({
            where: { enrollmentId: { in: enrollmentIds }, deletedAt: null },
          })
        : 0,
      enrollmentIds.length > 0
        ? prisma.enrollmentFinalGrade.count({
            where: { enrollmentId: { in: enrollmentIds } },
          })
        : 0,
    ]);

  return {
    staffAssignments,
    staffRemoved: 0,
    enrollments: enrollmentIds.length,
    attendance,
    assessments,
    finalGrades,
    orphanStudentsRemoved: 0,
  };
}

export function hasExistingSchoolYearData(counts: SchoolYearDataCounts): boolean {
  return (
    counts.staffAssignments > 0 ||
    counts.enrollments > 0 ||
    counts.attendance > 0 ||
    counts.assessments > 0 ||
    counts.finalGrades > 0
  );
}

/**
 * Deletes Staff + Students roster data for ONE school + academic year link.
 *
 * Removes:
 * - staff_assignments for this year
 * - staff with no remaining assignments (after that)
 * - enrollments for this year (+ attendance / assessments / final grades on those enrollments)
 * - students left with no enrollments
 *
 * Does NOT remove (never touches app_users):
 * - app_users / passwords / user_roles / user_schools
 * - academic_years / academic_year_schools
 * - calendar days / holidays
 * - classrooms / school links
 */
export async function purgeSchoolYearImportData(
  prisma: PrismaClient,
  schoolId: string,
  academicYearSchoolId: string
): Promise<SchoolYearDataCounts> {
  const enrollments = await getSchoolYearEnrollmentIds(
    prisma,
    schoolId,
    academicYearSchoolId
  );
  const enrollmentIds = enrollments.map((e) => e.id);
  const studentIds = [...new Set(enrollments.map((e) => e.studentId))];

  const yearStaff = await prisma.staffAssignment.findMany({
    where: { academicYearSchoolId },
    select: { staffId: true },
  });
  const yearStaffIds = [...new Set(yearStaff.map((row) => row.staffId))];

  const staffAssignmentResult = await prisma.staffAssignment.deleteMany({
    where: { academicYearSchoolId },
  });

  let staffRemoved = 0;
  for (const staffId of yearStaffIds) {
    const remaining = await prisma.staffAssignment.count({
      where: { staffId },
    });
    if (remaining > 0) continue;

    const staff = await prisma.staff.findFirst({
      where: { id: staffId, schoolId },
      select: { id: true },
    });
    if (!staff) continue;

    // Delete staff row only — never delete the linked app_users login.
    await prisma.staff.delete({ where: { id: staffId } });
    staffRemoved++;
  }

  let attendance = 0;
  let assessments = 0;
  let finalGrades = 0;

  if (enrollmentIds.length > 0) {
    const attendanceResult = await prisma.attendance.deleteMany({
      where: { enrollmentId: { in: enrollmentIds } },
    });
    attendance = attendanceResult.count;

    const assessmentResult = await prisma.assessmentScore.deleteMany({
      where: { enrollmentId: { in: enrollmentIds } },
    });
    assessments = assessmentResult.count;

    const finalGradeResult = await prisma.enrollmentFinalGrade.deleteMany({
      where: { enrollmentId: { in: enrollmentIds } },
    });
    finalGrades = finalGradeResult.count;

    await prisma.studentEnrollment.deleteMany({
      where: { id: { in: enrollmentIds }, schoolId, academicYearSchoolId },
    });
  }

  let orphanStudentsRemoved = 0;
  for (const studentId of studentIds) {
    const remaining = await prisma.studentEnrollment.count({
      where: { studentId, deletedAt: null },
    });
    if (remaining === 0) {
      await prisma.student.delete({ where: { id: studentId } });
      orphanStudentsRemoved++;
    }
  }

  return {
    staffAssignments: staffAssignmentResult.count,
    staffRemoved,
    enrollments: enrollmentIds.length,
    attendance,
    assessments,
    finalGrades,
    orphanStudentsRemoved,
  };
}

export function formatSchoolYearCounts(counts: SchoolYearDataCounts): string {
  const lines = [
    `  Staff assignments: ${counts.staffAssignments}`,
    `  Enrollments:       ${counts.enrollments}`,
    `  Attendance:        ${counts.attendance}`,
    `  Assessments:       ${counts.assessments}`,
    `  Final grades:      ${counts.finalGrades}`,
  ];
  if (counts.staffRemoved > 0) {
    lines.splice(1, 0, `  Staff removed:     ${counts.staffRemoved}`);
  }
  if (counts.orphanStudentsRemoved > 0) {
    lines.push(`  Students removed:  ${counts.orphanStudentsRemoved}`);
  }
  return lines.join("\n");
}
