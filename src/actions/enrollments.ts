"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission, type AuthUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit/create-audit-log";
import {
  assertEnrollmentAccess,
  assertClassroomAccess,
  buildEnrollmentListFilter,
} from "@/lib/auth/enrollment-access";
import { buildEnrollmentEligibleStudentFilter } from "@/lib/auth/student-access";
import {
  buildClassroomListWhere,
  buildTeacherScopeWhere,
  isClassroomScopedUser,
} from "@/lib/auth/section-scope";
import {
  enrollmentSchema,
  enrollmentListSchema,
  type EnrollmentInput,
} from "@/lib/validations/enrollment";
import {
  getSelectedAcademicYear,
  resolveAcademicYearForSchool,
} from "@/lib/academic-year/resolve-year";
import { ensureStudentNumber } from "@/lib/students/student-number";

function parseEnrollmentData(data: EnrollmentInput) {
  const parsed = enrollmentSchema.parse(data);
  return {
    studentId: parsed.studentId,
    schoolId: parsed.schoolId,
    academicYearId: parsed.academicYearId,
    classroomId: parsed.classroomId,
    teacherId: parsed.teacherId || null,
    enrollmentDate: parsed.enrollmentDate
      ? new Date(parsed.enrollmentDate)
      : new Date(),
    status: parsed.status,
  };
}

async function validateEnrollmentScope(user: AuthUser, data: ReturnType<typeof parseEnrollmentData>) {
  if (isClassroomScopedUser(user)) {
    if (!user.classroomIds.includes(data.classroomId)) {
      throw new Error("You can only enroll students in your assigned grades");
    }
  } else if (!user.roles.includes("SUPER_ADMIN") && !user.schoolIds.includes(data.schoolId)) {
    throw new Error("Unauthorized school access");
  }

  const classroom = await prisma.classroom.findFirst({
    where: { id: data.classroomId, schoolId: data.schoolId, deletedAt: null },
  });
  if (!classroom) throw new Error("Classroom does not belong to selected school");

  const year = await prisma.academicYear.findFirst({
    where: { id: data.academicYearId, schoolId: data.schoolId, deletedAt: null },
  });
  if (!year) throw new Error("Academic year does not belong to selected school");
}

export async function createEnrollment(data: EnrollmentInput) {
  const user = await requirePermission("enrollments:create");
  const enrollmentData = parseEnrollmentData(data);
  await validateEnrollmentScope(user, enrollmentData);

  const existing = await prisma.studentEnrollment.findFirst({
    where: {
      studentId: enrollmentData.studentId,
      academicYearId: enrollmentData.academicYearId,
      schoolId: enrollmentData.schoolId,
      deletedAt: null,
    },
  });
  if (existing) {
    throw new Error("Student is already enrolled for this school and academic year");
  }

  const enrollment = await prisma.$transaction(async (tx) => {
    await ensureStudentNumber(tx, enrollmentData.studentId, enrollmentData.schoolId);
    return tx.studentEnrollment.create({ data: enrollmentData });
  });

  await createAuditLog({
    userId: user.id,
    schoolId: enrollment.schoolId,
    entity: "StudentEnrollment",
    entityId: enrollment.id,
    action: "CREATE",
    newValues: enrollment as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/enrollments");
  return { id: enrollment.id };
}

export async function updateEnrollment(id: string, data: EnrollmentInput) {
  const user = await requirePermission("enrollments:update");
  if (!(await assertEnrollmentAccess(user, id))) {
    throw new Error("Unauthorized access to enrollment");
  }

  const enrollmentData = parseEnrollmentData(data);
  await validateEnrollmentScope(user, enrollmentData);

  const before = await prisma.studentEnrollment.findUnique({ where: { id } });
  if (!before || before.deletedAt) throw new Error("Enrollment not found");

  const enrollment = await prisma.studentEnrollment.update({
    where: { id },
    data: enrollmentData,
  });

  await createAuditLog({
    userId: user.id,
    schoolId: enrollment.schoolId,
    entity: "StudentEnrollment",
    entityId: enrollment.id,
    action: "UPDATE",
    oldValues: before as unknown as Prisma.InputJsonValue,
    newValues: enrollment as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/enrollments");
  revalidatePath(`/enrollments/${id}`);
  return { id: enrollment.id };
}

export async function getEligibleStudentsForEnrollment(
  schoolId: string,
  academicYearId: string,
  includeStudentId?: string
) {
  const user = await requirePermission("enrollments:read");

  if (!user.roles.includes("SUPER_ADMIN") && !user.schoolIds.includes(schoolId)) {
    throw new Error("Unauthorized school access");
  }

  const year = await prisma.academicYear.findFirst({
    where: { id: academicYearId, schoolId, deletedAt: null },
  });
  if (!year) throw new Error("Academic year does not belong to selected school");

  const scopeFilter = buildEnrollmentEligibleStudentFilter(user, schoolId);

  const students = await prisma.student.findMany({
    where: {
      AND: [
        scopeFilter,
        {
          NOT: {
            enrollments: {
              some: {
                schoolId,
                academicYearId,
                deletedAt: null,
              },
            },
          },
        },
      ],
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
    take: 500,
  });

  if (includeStudentId && !students.some((s) => s.id === includeStudentId)) {
    const current = await prisma.student.findFirst({
      where: {
        id: includeStudentId,
        deletedAt: null,
        AND: [scopeFilter],
      },
      select: { id: true, firstName: true, lastName: true },
    });
    if (current) {
      return [...students, current].sort(
        (a, b) =>
          a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)
      );
    }
  }

  return students;
}

export async function deleteEnrollment(id: string) {
  const user = await requirePermission("enrollments:delete");
  if (!(await assertEnrollmentAccess(user, id))) {
    throw new Error("Unauthorized access to enrollment");
  }

  const before = await prisma.studentEnrollment.findUnique({ where: { id } });
  if (!before || before.deletedAt) throw new Error("Enrollment not found");

  const enrollment = await prisma.studentEnrollment.update({
    where: { id },
    data: { deletedAt: new Date(), status: "WITHDRAWN" },
  });

  await createAuditLog({
    userId: user.id,
    schoolId: enrollment.schoolId,
    entity: "StudentEnrollment",
    entityId: enrollment.id,
    action: "DELETE",
    oldValues: before as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/enrollments");
  return { id: enrollment.id };
}

export async function getEnrollments(rawParams: {
  page?: number;
  pageSize?: number;
  search?: string;
  schoolId?: string;
  academicYearId?: string;
  classroomId?: string;
  status?: string;
}) {
  const user = await requirePermission("enrollments:read");
  const params = enrollmentListSchema.parse(rawParams);

  const selectedYear = await getSelectedAcademicYear(user);

  let resolvedYearId = params.academicYearId;
  let yearNameFilter: string | undefined;

  if (!resolvedYearId && selectedYear) {
    if (user.roles.includes("SUPER_ADMIN")) {
      yearNameFilter = selectedYear.name;
    } else {
      const schoolId = params.schoolId ?? user.schoolIds[0];
      if (schoolId) {
        const schoolYear = await resolveAcademicYearForSchool(
          schoolId,
          selectedYear
        );
        resolvedYearId = schoolYear?.id;
      }
    }
  }

  const where = buildEnrollmentListFilter(user, {
    ...params,
    academicYearId: resolvedYearId,
    academicYearName: yearNameFilter,
  });

  const [data, total] = await Promise.all([
    prisma.studentEnrollment.findMany({
      where,
      orderBy: { enrollmentDate: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: {
        student: true,
        school: true,
        academicYear: true,
        classroom: { include: { grade: true, section: true } },
        teacher: { select: { firstName: true, lastName: true } },
        finalGrade: true,
      },
    }),
    prisma.studentEnrollment.count({ where }),
  ]);

  return {
    data,
    meta: {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages: Math.ceil(total / params.pageSize),
    },
  };
}

export async function getEnrollmentById(id: string) {
  const user = await requirePermission("enrollments:read");
  if (!(await assertEnrollmentAccess(user, id))) {
    throw new Error("Unauthorized access to enrollment");
  }

  return prisma.studentEnrollment.findFirst({
    where: { id, deletedAt: null },
    include: {
      student: true,
      school: true,
      academicYear: true,
      classroom: { include: { grade: true, section: true } },
      teacher: true,
      finalGrade: true,
      assessments: { where: { deletedAt: null } },
      attendance: {
        where: { deletedAt: null },
        include: { calendarDay: true },
        orderBy: { calendarDay: { date: "desc" } },
        take: 10,
      },
    },
  });
}

export async function getEnrollmentFormOptions() {
  const user = await requirePermission("enrollments:read");

  const schoolFilter =
    user.roles.includes("SUPER_ADMIN")
      ? { deletedAt: null, isActive: true }
      : { id: { in: user.schoolIds }, deletedAt: null, isActive: true };

  const classroomFilter = buildClassroomListWhere(user);

  const [schools, classrooms, years, teachers] = await Promise.all([
    prisma.school.findMany({
      where: schoolFilter,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.classroom.findMany({
      where: classroomFilter,
      orderBy: { name: "asc" },
      include: { grade: true, section: true, school: { select: { name: true } } },
    }),
    prisma.academicYear.findMany({
      where: user.roles.includes("SUPER_ADMIN")
        ? { deletedAt: null }
        : { schoolId: { in: user.schoolIds }, deletedAt: null },
      orderBy: { startDate: "desc" },
      include: { school: { select: { id: true, name: true } } },
    }),
    prisma.teacher.findMany({
      where: buildTeacherScopeWhere(user, { isActive: true }),
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        schoolId: true,
        classrooms: { select: { classroomId: true } },
      },
    }),
  ]);

  return {
    schools,
    classrooms: classrooms.map((c) => ({
      id: c.id,
      name: c.name,
      schoolId: c.schoolId,
      label: c.name,
    })),
    academicYears: years.map((y) => ({
      id: y.id,
      name: y.name,
      schoolId: y.schoolId,
      label: `${y.name} — ${y.school.name}`,
      isActive: y.isActive,
    })),
    teachers: teachers.map((teacher) => ({
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      schoolId: teacher.schoolId,
      classroomId: teacher.classrooms[0]?.classroomId ?? null,
    })),
  };
}

export async function getClassroomsForAssessment() {
  const user = await requirePermission("assessments:read");
  const selectedYear = await getSelectedAcademicYear(user);

  const where = buildClassroomListWhere(user);

  const classrooms = await prisma.classroom.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      school: { select: { name: true } },
      grade: true,
      section: true,
      _count: {
        select: {
          enrollments: { where: { deletedAt: null, status: "ACTIVE" } },
        },
      },
    },
  });

  if (classrooms.length === 0) return classrooms;

  const schoolIds = [...new Set(classrooms.map((c) => c.schoolId))];
  const yearBySchool = new Map<string, string>();
  for (const schoolId of schoolIds) {
    const year = await resolveAcademicYearForSchool(schoolId, selectedYear);
    if (year) yearBySchool.set(schoolId, year.id);
  }

  const yearIds = [...new Set(yearBySchool.values())];
  const counts = await prisma.studentEnrollment.groupBy({
    by: ["classroomId"],
    where: {
      classroomId: { in: classrooms.map((c) => c.id) },
      academicYearId: { in: yearIds },
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
