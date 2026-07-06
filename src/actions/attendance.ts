"use server";

import { revalidatePath } from "next/cache";
import { AttendanceStatus, BehaviorValue, asAttendanceStatus, asBehaviorValue, asSessionType } from "@/lib/setup-types";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit/create-audit-log";
import { assertClassroomAccess, assertUserSchoolAccess } from "@/lib/auth/enrollment-access";
import { assertCanPerformScopedWrite } from "@/lib/auth/scope-write";
import {
  buildClassroomListWhere,
  isClassroomScopedUser,
  scopedClassroomIdFilter,
} from "@/lib/auth/section-scope";
import { recomputeGradesForEnrollments } from "@/lib/grades/compute-enrollment-grade";
import { BehaviorCalculationService } from "@/lib/behavior";
import {
  ATTENDANCE_MARKABLE_SESSION_TYPES,
} from "@/lib/grades/attendance-percentage";
import { selectDefaultCalendarDayId } from "@/lib/calendar/select-default-day";
import { sendAbsentNotification } from "@/lib/email/send-absent-notification";
import { decryptStudentPii } from "@/lib/students/student-pii";
import { getSelectedAcademicYear, resolveAcademicYearForSchool, resolveAcademicYearIdsForSchools } from "@/lib/academic-year/resolve-year";

import {
  bulkAttendanceMatrixSchema,
  bulkAttendanceSchema,
  type AttendanceRecordInput,
  type MatrixAttendanceRecordInput,
} from "@/lib/validations/attendance";

export type AttendanceRecord = AttendanceRecordInput;
export type MatrixAttendanceRecord = MatrixAttendanceRecordInput;

export async function bulkUpsertAttendance(
  calendarDayId: string,
  records: AttendanceRecord[]
) {
  const parsed = bulkAttendanceSchema.parse({ calendarDayId, records });
  const user = await requirePermission("attendance:update");
  const { calendarDayId: validatedDayId, records: validatedRecords } = parsed;

  const calendarDay = await prisma.academicCalendarDay.findUnique({
    where: { id: validatedDayId },
    include: {
      academicYearSchool: { include: { school: true } },
    },
  });
  if (!calendarDay) throw new Error("Calendar day not found");

  const schoolId = calendarDay.academicYearSchool.schoolId;
  await assertUserSchoolAccess(user, schoolId);
  assertCanPerformScopedWrite(user);

  const enrollmentIds = [...new Set(validatedRecords.map((r) => r.enrollmentId))];
  if (enrollmentIds.length === 0) {
    return { success: true, emailsSent: 0 };
  }

  const [enrollments, previousRecords] = await Promise.all([
    prisma.studentEnrollment.findMany({
      where: { id: { in: enrollmentIds } },
      include: {
        student: true,
        classroom: true,
        school: true,
      },
    }),
    prisma.attendance.findMany({
      where: {
        calendarDayId: validatedDayId,
        enrollmentId: { in: enrollmentIds },
      },
    }),
  ]);

  const enrollmentMap = new Map(enrollments.map((e) => [e.id, e]));
  const previousMap = new Map(previousRecords.map((p) => [p.enrollmentId, p]));

  if (enrollments.length !== enrollmentIds.length) {
    throw new Error("One or more enrollments are invalid");
  }

  const touchedEnrollments = new Set<string>();
  let emailsSent = 0;

  for (const record of validatedRecords) {
    const enrollment = enrollmentMap.get(record.enrollmentId);
    if (!enrollment) {
      throw new Error("Invalid enrollment");
    }

    if (enrollment.schoolId !== schoolId) {
      throw new Error("Enrollment does not belong to this calendar day");
    }

    if (
      isClassroomScopedUser(user) &&
      !user.classroomIds.includes(enrollment.classroomId)
    ) {
      throw new Error("Unauthorized enrollment access");
    }

    if (
      !user.roles.includes("SUPER_ADMIN") &&
      !isClassroomScopedUser(user) &&
      !user.schoolIds.includes(enrollment.schoolId)
    ) {
      throw new Error("Unauthorized enrollment access");
    }

    const previous = previousMap.get(record.enrollmentId);

    await prisma.attendance.upsert({
      where: {
        enrollmentId_calendarDayId: {
          enrollmentId: record.enrollmentId,
          calendarDayId: validatedDayId,
        },
      },
      create: {
        enrollmentId: record.enrollmentId,
        calendarDayId: validatedDayId,
        status: record.status,
        behaviorValue: record.behaviorValue,
        behaviorComments: record.behaviorComments,
        teacherComments: record.teacherComments,
        recordedById: user.id,
      },
      update: {
        status: record.status,
        behaviorValue: record.behaviorValue,
        behaviorComments: record.behaviorComments,
        teacherComments: record.teacherComments,
        recordedById: user.id,
      },
    });

    const becameAbsent =
      record.status === "ABSENT" && previous?.status !== "ABSENT";

    if (becameAbsent) {
      const student = decryptStudentPii(enrollment.student);
      if (student.parentEmail) {
        const result = await sendAbsentNotification({
          parentEmail: student.parentEmail,
          parentName: student.parentName,
          studentName: `${student.firstName} ${student.lastName}`,
          schoolName: enrollment.school.name,
          classroomName: enrollment.classroom.name,
          sessionDate: calendarDay.date,
          lessonPlanNumber: calendarDay.lessonPlanNumber,
        });
        if (result.sent) emailsSent++;
      }
    }

    touchedEnrollments.add(record.enrollmentId);
  }

  await recomputeGradesForEnrollments([...touchedEnrollments]);

  await createAuditLog({
    userId: user.id,
    entity: "Attendance",
    action: "UPDATE",
    newValues: {
      calendarDayId: validatedDayId,
      count: validatedRecords.length,
      emailsSent,
    },
  });

  revalidatePath("/teacher/attendance");
  revalidatePath("/attendance");
  revalidatePath("/attendance/summary");
  revalidatePath("/attendance/consolidate");
  revalidatePath("/teacher/attendance/consolidate");
  revalidatePath("/dashboard/teacher");
  return { success: true, emailsSent };
}

export async function getAttendanceSession(
  classroomId: string,
  calendarDayId?: string
) {
  const user = await requirePermission("attendance:read");
  if (!(await assertClassroomAccess(user, classroomId))) {
    throw new Error("Unauthorized classroom access");
  }

  const [classroom, selectedYear] = await Promise.all([
    prisma.classroom.findFirst({
      where: { id: classroomId, deletedAt: null },
      include: {
        grade: true,
        section: true,
        school: true,
      },
    }),
    getSelectedAcademicYear(user),
  ]);
  if (!classroom) return null;

  const activeYear = await resolveAcademicYearForSchool(
    classroom.schoolId,
    selectedYear
  );

  if (!activeYear) {
    return {
      classroom,
      activeYear: null,
      calendarDays: [],
      selectedDay: null,
      enrollments: [],
    };
  }

  const calendarDays = await prisma.academicCalendarDay.findMany({
    where: {
      academicYearSchoolId: activeYear.id,
      deletedAt: null,
      sessionType: { in: ATTENDANCE_MARKABLE_SESSION_TYPES },
    },
    orderBy: { date: "asc" },
  });

  let selectedDay = calendarDayId
    ? calendarDays.find((d) => d.id === calendarDayId)
    : undefined;

  if (!selectedDay && calendarDays.length) {
    const defaultId = selectDefaultCalendarDayId(calendarDays);
    selectedDay = calendarDays.find((d) => d.id === defaultId) ?? calendarDays[0];
  }

  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      classroomId,
      academicYearSchoolId: activeYear.id,
      deletedAt: null,
      status: "ACTIVE",
    },
    include: {
      student: {
        select: { firstName: true, lastName: true, gender: true, studentNumber: true },
      },
    },
    orderBy: { student: { lastName: "asc" } },
  });

  const attendanceByEnrollment = new Map<
    string,
    {
      status: string;
      behaviorValue: string | null;
      behaviorComments: string | null;
      teacherComments: string | null;
    }
  >();

  if (selectedDay && enrollments.length > 0) {
    const attendanceRows = await prisma.attendance.findMany({
      where: {
        calendarDayId: selectedDay.id,
        deletedAt: null,
        enrollmentId: { in: enrollments.map((e) => e.id) },
      },
      select: {
        enrollmentId: true,
        status: true,
        behaviorValue: true,
        behaviorComments: true,
        teacherComments: true,
      },
    });
    for (const row of attendanceRows) {
      attendanceByEnrollment.set(row.enrollmentId, row);
    }
  }

  const enrollmentIds = enrollments.map((e) => e.id);
  const ratingsByEnrollment = new Map<string, string[]>();

  if (enrollmentIds.length > 0) {
    const behaviorRows = await prisma.attendance.findMany({
      where: {
        enrollmentId: { in: enrollmentIds },
        deletedAt: null,
        behaviorValue: { not: null },
      },
      select: { enrollmentId: true, behaviorValue: true },
    });
    for (const row of behaviorRows) {
      if (!row.behaviorValue) continue;
      const list = ratingsByEnrollment.get(row.enrollmentId) ?? [];
      list.push(row.behaviorValue);
      ratingsByEnrollment.set(row.enrollmentId, list);
    }
  }

  return {
    classroom,
    activeYear,
    calendarDays: calendarDays.map((d) => ({
      ...d,
      sessionType: asSessionType(d.sessionType),
    })),
    selectedDay: selectedDay
      ? { ...selectedDay, sessionType: asSessionType(selectedDay.sessionType) }
      : null,
    enrollments: enrollments.map((e) => {
      const existing = attendanceByEnrollment.get(e.id);
      const behaviorScore = BehaviorCalculationService.calculateFromRaw(
        ratingsByEnrollment.get(e.id) ?? []
      );
      return {
        enrollmentId: e.id,
        studentName: `${e.student.firstName} ${e.student.lastName}`,
        studentNumber: e.student.studentNumber,
        gender: e.student.gender,
        behaviorScore,
        behaviorLevel: BehaviorCalculationService.levelForScore(behaviorScore),
        existing: existing
          ? {
              ...existing,
              status: asAttendanceStatus(existing.status),
              behaviorValue: existing.behaviorValue
                ? asBehaviorValue(existing.behaviorValue)
                : null,
            }
          : null,
      };
    }),
  };
}

async function attachEnrollmentCounts<
  T extends { id: string; schoolId: string },
>(
  classrooms: T[],
  selectedYear: Awaited<ReturnType<typeof getSelectedAcademicYear>>
): Promise<Array<T & { _count: { enrollments: number } }>> {
  if (classrooms.length === 0) return [];

  const schoolIds = [...new Set(classrooms.map((c) => c.schoolId))];
  const yearBySchool = await resolveAcademicYearIdsForSchools(
    schoolIds,
    selectedYear
  );

  const yearIds = [...new Set(yearBySchool.values())];
  if (yearIds.length === 0) {
    return classrooms.map((c) => ({
      ...c,
      _count: { enrollments: 0 },
    }));
  }

  const counts = await prisma.studentEnrollment.groupBy({
    by: ["classroomId"],
    where: {
      classroomId: { in: classrooms.map((c) => c.id) },
      academicYearSchoolId: { in: yearIds },
      deletedAt: null,
      status: "ACTIVE",
    },
    _count: { _all: true },
  });

  const countMap = new Map(counts.map((c) => [c.classroomId, c._count._all]));

  return classrooms.map((c) => ({
    ...c,
    _count: { enrollments: countMap.get(c.id) ?? 0 },
  }));
}

export async function getClassroomsForAttendance() {
  const user = await requirePermission("attendance:read");
  const selectedYear = await getSelectedAcademicYear(user);

  const where = buildClassroomListWhere(user);

  const classrooms = await prisma.classroom.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      school: { select: { name: true } },
      grade: { select: { name: true, sortOrder: true } },
      section: { select: { name: true } },
    },
  });

  return attachEnrollmentCounts(classrooms, selectedYear);
}

export async function getSchoolsForAttendanceSummary() {
  const user = await requirePermission("attendance:read");

  const where = user.roles.includes("SUPER_ADMIN")
    ? { deletedAt: null, isActive: true }
    : { id: { in: user.schoolIds }, deletedAt: null, isActive: true };

  return prisma.school.findMany({
    where,
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function getClassroomsForConsolidateAttendance(schoolId: string) {
  const user = await requirePermission("attendance:read");
  const selectedYear = await getSelectedAcademicYear(user);
  const schoolYear = await resolveAcademicYearForSchool(schoolId, selectedYear);

  if (
    !user.roles.includes("SUPER_ADMIN") &&
    !user.schoolIds.includes(schoolId)
  ) {
    throw new Error("Unauthorized school access");
  }

  const classroomFilter = scopedClassroomIdFilter(user);

  return prisma.classroom.findMany({
    where: {
      schoolId,
      deletedAt: null,
      isActive: true,
      ...classroomFilter,
      enrollments: {
        some: {
          status: "ACTIVE",
          deletedAt: null,
          ...(schoolYear ? { academicYearSchoolId: schoolYear.id } : {}),
        },
      },
    },
    orderBy: [{ grade: { sortOrder: "asc" } }, { section: { name: "asc" } }],
    select: {
      id: true,
      name: true,
      grade: { select: { name: true } },
      section: { select: { name: true } },
    },
  });
}

export async function getGradesForAttendanceSummary(schoolId: string) {
  const user = await requirePermission("attendance:read");
  const selectedYear = await getSelectedAcademicYear(user);
  const schoolYear = await resolveAcademicYearForSchool(schoolId, selectedYear);

  if (
    !user.roles.includes("SUPER_ADMIN") &&
    !user.schoolIds.includes(schoolId)
  ) {
    throw new Error("Unauthorized school access");
  }

  const classroomFilter = scopedClassroomIdFilter(user);

  return prisma.grade.findMany({
    where: {
      classrooms: {
        some: {
          schoolId,
          deletedAt: null,
          isActive: true,
          ...classroomFilter,
          enrollments: {
            some: {
              status: "ACTIVE",
              deletedAt: null,
              ...(schoolYear ? { academicYearSchoolId: schoolYear.id } : {}),
            },
          },
        },
      },
    },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });
}

export type GradeAttendanceMatrixCell = {
  status: AttendanceStatus | null;
  behaviorValue: BehaviorValue | null;
};

export async function getGradeAttendanceMatrix(
  schoolId: string,
  filter?: { gradeId?: number | null; classroomId?: string | null }
) {
  const gradeId = filter?.gradeId;
  const classroomId = filter?.classroomId;
  const user = await requirePermission("attendance:read");
  const selectedYear = await getSelectedAcademicYear(user);

  if (
    !user.roles.includes("SUPER_ADMIN") &&
    !user.schoolIds.includes(schoolId)
  ) {
    throw new Error("Unauthorized school access");
  }

  const school = await prisma.school.findFirst({
    where: { id: schoolId, deletedAt: null, isActive: true },
    select: { id: true, name: true },
  });
  if (!school) return null;

  const grade =
    gradeId != null
      ? await prisma.grade.findUnique({
          where: { id: gradeId },
          select: { id: true, name: true },
        })
      : null;

  if (gradeId != null && !grade) return null;

  const classroomRecord =
    classroomId != null
      ? await prisma.classroom.findFirst({
          where: {
            id: classroomId,
            schoolId,
            deletedAt: null,
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            grade: { select: { id: true, name: true } },
          },
        })
      : null;

  if (classroomId != null && !classroomRecord) return null;

  const activeYear = await resolveAcademicYearForSchool(schoolId, selectedYear);
  if (!activeYear) {
    return {
      school,
      grade,
      academicYear: null,
      calendarDays: [],
      students: [],
    };
  }

  const enrollmentWhere: {
    schoolId: string;
    academicYearSchoolId: string;
    status: "ACTIVE";
    deletedAt: null;
    classroomId?: string | { in: string[] };
    classroom?: {
      gradeId: number;
      schoolId: string;
      deletedAt: null;
      isActive: true;
      id?: { in: string[] };
    };
  } = {
    schoolId,
    academicYearSchoolId: activeYear.id,
    status: "ACTIVE",
    deletedAt: null,
  };

  if (classroomId != null) {
    if (
      isClassroomScopedUser(user) &&
      !user.classroomIds.includes(classroomId)
    ) {
      enrollmentWhere.classroomId = "00000000-0000-0000-0000-000000000000";
    } else {
      enrollmentWhere.classroomId = classroomId;
    }
  } else if (gradeId != null) {
    enrollmentWhere.classroom = {
      gradeId,
      schoolId,
      deletedAt: null,
      isActive: true,
      ...scopedClassroomIdFilter(user),
    };
  } else if (isClassroomScopedUser(user) && user.classroomIds.length > 0) {
    enrollmentWhere.classroomId = { in: user.classroomIds };
  }

  const enrollmentOrderBy =
    classroomId != null || gradeId != null
      ? [
          { classroom: { name: "asc" as const } },
          { student: { lastName: "asc" as const } },
        ]
      : [
          { classroom: { grade: { sortOrder: "asc" as const } } },
          { classroom: { name: "asc" as const } },
          { student: { lastName: "asc" as const } },
        ];

  const [calendarDays, enrollments] = await Promise.all([
    prisma.academicCalendarDay.findMany({
      where: { academicYearSchoolId: activeYear.id, deletedAt: null },
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        lessonPlanNumber: true,
        sessionType: true,
      },
    }),
    prisma.studentEnrollment.findMany({
      where: enrollmentWhere,
      include: {
        student: { select: { firstName: true, lastName: true, studentNumber: true } },
        classroom: {
          select: { name: true, grade: { select: { name: true } } },
        },
      },
      orderBy: enrollmentOrderBy,
    }),
  ]);

  const calendarDayIds = calendarDays.map((d) => d.id);
  const enrollmentIds = enrollments.map((e) => e.id);

  const attendanceRows =
    enrollmentIds.length > 0 && calendarDayIds.length > 0
      ? await prisma.attendance.findMany({
          where: {
            enrollmentId: { in: enrollmentIds },
            calendarDayId: { in: calendarDayIds },
            deletedAt: null,
          },
          select: {
            enrollmentId: true,
            calendarDayId: true,
            status: true,
            behaviorValue: true,
          },
        })
      : [];

  const attendanceLookup = new Map<
    string,
    { status: string; behaviorValue: string | null }
  >();
  for (const row of attendanceRows) {
    attendanceLookup.set(`${row.enrollmentId}:${row.calendarDayId}`, row);
  }

  const calendarDayRows = calendarDays.map((d) => ({
    id: d.id,
    date: d.date,
    lessonPlanNumber: d.lessonPlanNumber,
    sessionType: asSessionType(d.sessionType),
  }));

  const students = enrollments.map((enrollment) => {
    const cells: Record<string, GradeAttendanceMatrixCell> = {};
    for (const day of calendarDayRows) {
      const record = attendanceLookup.get(`${enrollment.id}:${day.id}`);
      cells[day.id] = {
        status: record ? asAttendanceStatus(record.status) : null,
        behaviorValue: record?.behaviorValue
          ? asBehaviorValue(record.behaviorValue)
          : null,
      };
    }
    return {
      enrollmentId: enrollment.id,
      studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
      studentNumber: enrollment.student.studentNumber,
      gradeName: enrollment.classroom.grade.name,
      classroomName: enrollment.classroom.name,
      cells,
    };
  });

  return {
    school,
    grade: grade ?? classroomRecord?.grade ?? null,
    classroom: classroomRecord,
    academicYear: {
      id: activeYear.academicYearId,
      name: activeYear.academicYear.name,
    },
    calendarDays: calendarDayRows,
    students,
  };
}

export async function bulkUpsertAttendanceMatrix(records: MatrixAttendanceRecord[]) {
  await requirePermission("attendance:update");
  const validatedRecords = bulkAttendanceMatrixSchema.parse(records);
  if (validatedRecords.length === 0) {
    return { success: true, emailsSent: 0, saved: 0 };
  }

  const byDay = new Map<string, MatrixAttendanceRecord[]>();
  for (const record of validatedRecords) {
    const list = byDay.get(record.calendarDayId) ?? [];
    list.push(record);
    byDay.set(record.calendarDayId, list);
  }

  let emailsSent = 0;
  let saved = 0;

  for (const [calendarDayId, dayRecords] of byDay) {
    const result = await bulkUpsertAttendance(
      calendarDayId,
      dayRecords.map((r) => ({
        enrollmentId: r.enrollmentId,
        status: r.status,
        behaviorValue: r.behaviorValue,
      }))
    );
    emailsSent += result.emailsSent;
    saved += dayRecords.length;
  }

  revalidatePath("/attendance/summary");
  revalidatePath("/attendance/consolidate");
  revalidatePath("/teacher/attendance/consolidate");
  return { success: true, emailsSent, saved };
}
