import type { PrismaClient } from "@prisma/client";

export type PurgeCounts = {
  attendance: number;
  assessments: number;
  finalGrades: number;
  enrollments: number;
  teacherClassrooms: number;
  teachers: number;
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

  const teacherIds = (
    await prisma.teacher.findMany({
      where: { schoolId },
      select: { id: true },
    })
  ).map((t) => t.id);

  const teacherClassrooms = (
    await prisma.teacherClassroom.deleteMany({
      where: { teacherId: { in: teacherIds } },
    })
  ).count;

  const teachers = (
    await prisma.teacher.deleteMany({ where: { schoolId } })
  ).count;

  const classrooms = (
    await prisma.classroom.deleteMany({ where: { schoolId } })
  ).count;

  const yearIds = (
    await prisma.academicYear.findMany({
      where: { schoolId },
      select: { id: true },
    })
  ).map((y) => y.id);

  const calendarDays =
    yearIds.length > 0
      ? (
          await prisma.academicCalendarDay.deleteMany({
            where: { academicYearId: { in: yearIds } },
          })
        ).count
      : 0;

  const academicYears = (
    await prisma.academicYear.deleteMany({ where: { schoolId } })
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
    teacherClassrooms,
    teachers,
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
    `  Academic years:     ${counts.academicYears}`,
    `  Calendar days:      ${counts.calendarDays}`,
    `  Classrooms:         ${counts.classrooms}`,
    `  Teachers:           ${counts.teachers}`,
    `  Teacher classrooms: ${counts.teacherClassrooms}`,
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
      teacherClassrooms: total.teacherClassrooms + current.teacherClassrooms,
      teachers: total.teachers + current.teachers,
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
      teacherClassrooms: 0,
      teachers: 0,
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
