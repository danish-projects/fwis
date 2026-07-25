import type { PrismaClient } from "@prisma/client";

export type SchoolYearDataCounts = {
  enrollments: number;
  attendance: number;
  assessments: number;
  finalGrades: number;
  calendarDays: number;
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

  const [attendance, assessments, finalGrades, calendarDays] = await Promise.all([
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
    prisma.academicCalendarDay.count({
      where: { academicYearSchoolId, deletedAt: null },
    }),
  ]);

  return {
    enrollments: enrollmentIds.length,
    attendance,
    assessments,
    finalGrades,
    calendarDays,
    orphanStudentsRemoved: 0,
  };
}

export function hasExistingSchoolYearData(counts: SchoolYearDataCounts): boolean {
  return (
    counts.enrollments > 0 ||
    counts.attendance > 0 ||
    counts.assessments > 0 ||
    counts.finalGrades > 0 ||
    counts.calendarDays > 0
  );
}

/**
 * Deletes import-related data for ONE school + academic year school link only.
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

  const calendarResult = await prisma.academicCalendarDay.deleteMany({
    where: { academicYearSchoolId },
  });

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
    enrollments: enrollmentIds.length,
    attendance,
    assessments,
    finalGrades,
    calendarDays: calendarResult.count,
    orphanStudentsRemoved,
  };
}

export function formatSchoolYearCounts(counts: SchoolYearDataCounts): string {
  return [
    `  Enrollments:      ${counts.enrollments}`,
    `  Attendance:       ${counts.attendance}`,
    `  Assessments:      ${counts.assessments}`,
    `  Final grades:     ${counts.finalGrades}`,
    `  Calendar days:    ${counts.calendarDays}`,
  ].join("\n");
}
