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
  buildStaffScopeWhere,
  isClassroomScopedUser,
} from "@/lib/auth/section-scope";
import {
  enrollmentSchema,
  enrollmentListSchema,
  type EnrollmentInput,
} from "@/lib/validations/enrollment";
import {
  getSelectedAcademicYear,
  resolveAcademicYearSchoolForSchool,
} from "@/lib/academic-year/resolve-year";
import { resolveListSchoolId } from "@/lib/school/resolve-school";
import { ensureStudentNumber } from "@/lib/students/student-number";
import { classroomBelongsToSchool } from "@/lib/classrooms/ensure-classroom-for-school";

async function resolveAcademicYearSchoolId(
  schoolId: string,
  globalAcademicYearId: string
) {
  const link = await prisma.academicYearSchool.findFirst({
    where: {
      schoolId,
      academicYearId: globalAcademicYearId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!link) {
    throw new Error("Academic year is not linked to the selected school");
  }
  return link.id;
}

function parseEnrollmentData(data: EnrollmentInput) {
  const parsed = enrollmentSchema.parse(data);
  return {
    studentId: parsed.studentId,
    schoolId: parsed.schoolId,
    academicYearId: parsed.academicYearId,
    classroomId: parsed.classroomId,
    staffId: parsed.staffId || null,
    enrollmentDate: parsed.enrollmentDate
      ? new Date(parsed.enrollmentDate)
      : new Date(),
    status: parsed.status,
  };
}

async function validateEnrollmentScope(
  user: AuthUser,
  data: ReturnType<typeof parseEnrollmentData>
) {
  if (isClassroomScopedUser(user)) {
    if (!user.classroomIds.includes(data.classroomId)) {
      throw new Error("You can only enroll students in your assigned grades");
    }
  } else if (!user.roles.includes("NIGRA") && !user.schoolIds.includes(data.schoolId)) {
    throw new Error("Unauthorized school access");
  }

  const belongs = await classroomBelongsToSchool(
    prisma,
    data.classroomId,
    data.schoolId
  );
  if (!belongs) throw new Error("Classroom does not belong to selected school");

  const year = await prisma.academicYear.findFirst({
    where: { id: data.academicYearId, deletedAt: null },
  });
  if (!year) throw new Error("Academic year not found");

  await resolveAcademicYearSchoolId(data.schoolId, data.academicYearId);
}

export async function createEnrollment(data: EnrollmentInput) {
  const user = await requirePermission("enrollments:create");
  const enrollmentData = parseEnrollmentData(data);
  await validateEnrollmentScope(user, enrollmentData);

  const academicYearSchoolId = await resolveAcademicYearSchoolId(
    enrollmentData.schoolId,
    enrollmentData.academicYearId
  );

  const existing = await prisma.studentEnrollment.findFirst({
    where: {
      studentId: enrollmentData.studentId,
      academicYearSchoolId,
      deletedAt: null,
    },
  });
  if (existing) {
    throw new Error("Student is already enrolled for this school and academic year");
  }

  const enrollment = await prisma.$transaction(async (tx) => {
    await ensureStudentNumber(tx, enrollmentData.studentId, enrollmentData.schoolId);
    return tx.studentEnrollment.create({
      data: {
        studentId: enrollmentData.studentId,
        schoolId: enrollmentData.schoolId,
        academicYearSchoolId,
        classroomId: enrollmentData.classroomId,
        staffId: enrollmentData.staffId,
        enrollmentDate: enrollmentData.enrollmentDate,
        status: enrollmentData.status,
      },
    });
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

  const academicYearSchoolId = await resolveAcademicYearSchoolId(
    enrollmentData.schoolId,
    enrollmentData.academicYearId
  );

  const enrollment = await prisma.studentEnrollment.update({
    where: { id },
    data: {
      studentId: enrollmentData.studentId,
      schoolId: enrollmentData.schoolId,
      academicYearSchoolId,
      classroomId: enrollmentData.classroomId,
      staffId: enrollmentData.staffId,
      enrollmentDate: enrollmentData.enrollmentDate,
      status: enrollmentData.status,
    },
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

  if (!user.roles.includes("NIGRA") && !user.schoolIds.includes(schoolId)) {
    throw new Error("Unauthorized school access");
  }

  const academicYearSchoolId = await resolveAcademicYearSchoolId(
    schoolId,
    academicYearId
  );

  const scopeFilter = buildEnrollmentEligibleStudentFilter(user, schoolId);

  const students = await prisma.student.findMany({
    where: {
      AND: [
        scopeFilter,
        {
          NOT: {
            enrollments: {
              some: {
                academicYearSchoolId,
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
  const listSchoolId = await resolveListSchoolId(user, params.schoolId);

  const selectedYear = await getSelectedAcademicYear(user);

  let resolvedYearSchoolId: string | undefined;

  if (params.academicYearId && listSchoolId) {
    try {
      resolvedYearSchoolId = await resolveAcademicYearSchoolId(
        listSchoolId,
        params.academicYearId
      );
    } catch {
      resolvedYearSchoolId = undefined;
    }
  } else if (selectedYear && listSchoolId) {
    const schoolYear = await resolveAcademicYearSchoolForSchool(
      listSchoolId,
      selectedYear
    );
    resolvedYearSchoolId = schoolYear?.id;
  }

  const where = buildEnrollmentListFilter(user, {
    ...params,
    schoolId: listSchoolId ?? "00000000-0000-0000-0000-000000000000",
    academicYearSchoolId: resolvedYearSchoolId,
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
        academicYearSchool: { include: { academicYear: true } },
        classroom: { include: { grade: true, section: true } },
        staff: { select: { firstName: true, lastName: true } },
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
      academicYearSchool: { include: { academicYear: true } },
      classroom: { include: { grade: true, section: true } },
      staff: true,
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
  const listSchoolId = await resolveListSchoolId(user);
  const selectedYear = await getSelectedAcademicYear(user);

  const schoolFilter = listSchoolId
    ? { id: listSchoolId, deletedAt: null, isActive: true }
    : user.roles.includes("NIGRA")
      ? { id: "00000000-0000-0000-0000-000000000000", deletedAt: null }
      : { id: { in: user.schoolIds }, deletedAt: null, isActive: true };

  const classroomFilter = buildClassroomListWhere(
    user,
    listSchoolId
      ? { schoolId: listSchoolId }
      : { schoolId: "00000000-0000-0000-0000-000000000000" }
  );

  const schoolIdsForYear =
    listSchoolId != null
      ? [listSchoolId]
      : user.roles.includes("NIGRA")
        ? []
        : user.schoolIds;
  const yearSchoolIds = (
    await Promise.all(
      schoolIdsForYear.map((schoolId) =>
        resolveAcademicYearSchoolForSchool(schoolId, selectedYear)
      )
    )
  )
    .filter(Boolean)
    .map((link) => link!.id);

  const [schools, classrooms, yearLinks, staffMembers] = await Promise.all([
    prisma.school.findMany({
      where: schoolFilter,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.classroom.findMany({
      where: classroomFilter,
      orderBy: { name: "asc" },
      include: {
        grade: true,
        section: true,
        schoolLinks: {
          where: listSchoolId
            ? { schoolId: listSchoolId, deletedAt: null }
            : { deletedAt: null },
          select: { schoolId: true },
        },
      },
    }),
    prisma.academicYearSchool.findMany({
      where: listSchoolId
        ? {
            schoolId: listSchoolId,
            deletedAt: null,
            academicYear: { deletedAt: null },
          }
        : user.roles.includes("NIGRA")
          ? { id: "00000000-0000-0000-0000-000000000000" }
          : {
              schoolId: { in: user.schoolIds },
              deletedAt: null,
              academicYear: { deletedAt: null },
            },
      orderBy: { academicYear: { startDate: "desc" } },
      include: {
        academicYear: { select: { id: true, name: true } },
        school: { select: { id: true, name: true } },
      },
    }),
    prisma.staff.findMany({
      where: buildStaffScopeWhere(user, {
        isActive: true,
        ...(listSchoolId ? { schoolId: listSchoolId } : {}),
      }),
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        schoolId: true,
        assignments: {
          where:
            yearSchoolIds.length > 0
              ? { academicYearSchoolId: { in: yearSchoolIds } }
              : { id: "00000000-0000-0000-0000-000000000000" },
          select: { classroomId: true },
        },
      },
    }),
  ]);

  const globalYears = new Map<
    string,
    { id: string; name: string; label: string }
  >();
  for (const link of yearLinks) {
    if (!globalYears.has(link.academicYear.id)) {
      globalYears.set(link.academicYear.id, {
        id: link.academicYear.id,
        name: link.academicYear.name,
        label: link.academicYear.name,
      });
    }
  }

  return {
    schools,
    classrooms: classrooms.map((c) => ({
      id: c.id,
      name: c.name,
      schoolId: c.schoolLinks[0]?.schoolId ?? listSchoolId ?? "",
      label: c.name,
    })),
    academicYears: yearLinks.map((link) => ({
      id: link.academicYear.id,
      name: link.academicYear.name,
      schoolId: link.schoolId,
      label: link.academicYear.name,
      isActive: link.isActive,
    })),
    globalAcademicYears: [...globalYears.values()],
    staff: staffMembers.map((staff) => ({
      id: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      schoolId: staff.schoolId,
      classroomId: staff.assignments[0]?.classroomId ?? null,
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
      schoolLinks: {
        where: {
          deletedAt: null,
          isActive: true,
          ...(user.roles.includes("NIGRA")
            ? {}
            : { schoolId: { in: user.schoolIds } }),
        },
        include: { school: { select: { name: true } } },
      },
      grade: true,
      section: true,
      _count: {
        select: {
          enrollments: { where: { deletedAt: null, status: "ACTIVE" } },
        },
      },
    },
  });

  if (classrooms.length === 0) return [];

  const mapped = classrooms.flatMap((c) => {
    if (c.schoolLinks.length === 0) return [];
    return c.schoolLinks.map((link) => ({
      ...c,
      schoolId: link.schoolId,
      school: link.school,
      schoolLinks: c.schoolLinks.map((l) => ({ schoolId: l.schoolId })),
    }));
  });

  if (mapped.length === 0) return [];

  const schoolIds = [...new Set(mapped.map((c) => c.schoolId).filter(Boolean))];
  const yearBySchool = new Map<string, string>();
  for (const schoolId of schoolIds) {
    const year = await resolveAcademicYearSchoolForSchool(schoolId, selectedYear);
    if (year) yearBySchool.set(schoolId, year.id);
  }

  const yearSchoolIds = [...new Set(yearBySchool.values())];
  if (yearSchoolIds.length === 0) {
    return mapped.map((c) => ({
      ...c,
      _count: { enrollments: 0 },
    }));
  }

  const counts = await prisma.studentEnrollment.groupBy({
    by: ["classroomId", "academicYearSchoolId"],
    where: {
      classroomId: { in: [...new Set(mapped.map((c) => c.id))] },
      academicYearSchoolId: { in: yearSchoolIds },
      deletedAt: null,
      status: "ACTIVE",
    },
    _count: { _all: true },
  });

  const countMap = new Map(
    counts.map((c) => [`${c.classroomId}:${c.academicYearSchoolId}`, c._count._all])
  );

  return mapped.map((c) => {
    const yearSchoolId = yearBySchool.get(c.schoolId);
    const enrollments = yearSchoolId
      ? (countMap.get(`${c.id}:${yearSchoolId}`) ?? 0)
      : 0;
    return {
      ...c,
      _count: { enrollments },
    };
  });
}
