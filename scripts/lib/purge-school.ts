import type { PrismaClient } from "@prisma/client";

export type PurgeCounts = {
  attendance: number;
  assessments: number;
  finalGrades: number;
  enrollments: number;
  staffClassrooms: number;
  staff: number;
  classrooms: number;
  calendarDays: number;
  academicYears: number;
  auditLogs: number;
  userSchools: number;
  students: number;
  schools: number;
};

async function deleteEnrollmentScopedData(
  prisma: PrismaClient,
  enrollmentIds: string[]
): Promise<
  Pick<PurgeCounts, "attendance" | "assessments" | "finalGrades" | "enrollments">
> {
  if (enrollmentIds.length === 0) {
    return {
      attendance: 0,
      assessments: 0,
      finalGrades: 0,
      enrollments: 0,
    };
  }

  const attendance = (
    await prisma.attendance.deleteMany({
      where: { enrollmentId: { in: enrollmentIds } },
    })
  ).count;
  const assessments = (
    await prisma.assessmentScore.deleteMany({
      where: { enrollmentId: { in: enrollmentIds } },
    })
  ).count;
  const finalGrades = (
    await prisma.enrollmentFinalGrade.deleteMany({
      where: { enrollmentId: { in: enrollmentIds } },
    })
  ).count;
  const enrollments = (
    await prisma.studentEnrollment.deleteMany({
      where: { id: { in: enrollmentIds } },
    })
  ).count;

  return { attendance, assessments, finalGrades, enrollments };
}

async function removeOrphanStudents(
  prisma: PrismaClient,
  studentIds: string[]
): Promise<number> {
  let removed = 0;
  for (const studentId of studentIds) {
    const remaining = await prisma.studentEnrollment.count({
      where: { studentId },
    });
    if (remaining === 0) {
      await prisma.student.delete({ where: { id: studentId } });
      removed++;
    }
  }
  return removed;
}

export async function purgeSchool(
  prisma: PrismaClient,
  schoolId: string
): Promise<PurgeCounts> {
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { schoolId },
    select: { id: true, studentId: true },
  });
  const enrollmentIds = enrollments.map((e) => e.id);
  const studentIds = [...new Set(enrollments.map((e) => e.studentId))];

  const scoped = await deleteEnrollmentScopedData(prisma, enrollmentIds);

  const staffIds = (
    await prisma.staff.findMany({
      where: { schoolId },
      select: { id: true },
    })
  ).map((t) => t.id);

  const staffClassrooms = (
    await prisma.staffAssignment.deleteMany({
      where: { staffId: { in: staffIds } },
    })
  ).count;

  const staff = (
    await prisma.staff.deleteMany({ where: { schoolId } })
  ).count;

  const classrooms = (
    await prisma.classroomSchool.deleteMany({ where: { schoolId } })
  ).count;

  const schoolYearLinks = await prisma.academicYearSchool.findMany({
    where: { schoolId },
    select: { id: true },
  });
  const schoolYearIds = schoolYearLinks.map((link) => link.id);

  const calendarDays =
    schoolYearIds.length > 0
      ? (
          await prisma.academicCalendarDay.deleteMany({
            where: { academicYearSchoolId: { in: schoolYearIds } },
          })
        ).count
      : 0;

  // Year-scoped staff assignments already deleted above via staffIds; also clear
  // any leftover assignments hanging off year links.
  if (schoolYearIds.length > 0) {
    await prisma.staffAssignment.deleteMany({
      where: { academicYearSchoolId: { in: schoolYearIds } },
    });
  }

  const academicYears = (
    await prisma.academicYearSchool.deleteMany({ where: { schoolId } })
  ).count;

  const auditLogs = (
    await prisma.auditLog.deleteMany({ where: { schoolId } })
  ).count;

  const userSchools = (
    await prisma.userSchool.deleteMany({ where: { schoolId } })
  ).count;

  const students = await removeOrphanStudents(prisma, studentIds);

  const schools = (await prisma.school.delete({ where: { id: schoolId } })).id
    ? 1
    : 0;

  return {
    ...scoped,
    staffClassrooms,
    staff,
    classrooms,
    calendarDays,
    academicYears,
    auditLogs,
    userSchools,
    students,
    schools,
  };
}

export function formatPurgeCounts(counts: PurgeCounts): string {
  return [
    `  Schools:            ${counts.schools}`,
    `  Academic year links: ${counts.academicYears}`,
    `  Calendar days:      ${counts.calendarDays}`,
    `  Classroom-school links: ${counts.classrooms}`,
    `  Staff:              ${counts.staff}`,
    `  Staff assignments:  ${counts.staffClassrooms}`,
    `  Enrollments:        ${counts.enrollments}`,
    `  Students removed:   ${counts.students}`,
    `  Attendance:         ${counts.attendance}`,
    `  Assessments:        ${counts.assessments}`,
    `  Final grades:       ${counts.finalGrades}`,
    `  Audit logs:         ${counts.auditLogs}`,
    `  User-school links:  ${counts.userSchools}`,
  ].join("\n");
}

export function sumPurgeCounts(counts: PurgeCounts[]): PurgeCounts {
  return counts.reduce(
    (total, current) => ({
      attendance: total.attendance + current.attendance,
      assessments: total.assessments + current.assessments,
      finalGrades: total.finalGrades + current.finalGrades,
      enrollments: total.enrollments + current.enrollments,
      staffClassrooms: total.staffClassrooms + current.staffClassrooms,
      staff: total.staff + current.staff,
      classrooms: total.classrooms + current.classrooms,
      calendarDays: total.calendarDays + current.calendarDays,
      academicYears: total.academicYears + current.academicYears,
      auditLogs: total.auditLogs + current.auditLogs,
      userSchools: total.userSchools + current.userSchools,
      students: total.students + current.students,
      schools: total.schools + current.schools,
    }),
    {
      attendance: 0,
      assessments: 0,
      finalGrades: 0,
      enrollments: 0,
      staffClassrooms: 0,
      staff: 0,
      classrooms: 0,
      calendarDays: 0,
      academicYears: 0,
      auditLogs: 0,
      userSchools: 0,
      students: 0,
      schools: 0,
    }
  );
}
