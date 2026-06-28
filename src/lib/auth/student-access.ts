import { Prisma } from "@prisma/client";
import type { AuthUser } from "@/lib/auth/session";
import { getPrimaryRole, hasPermission } from "@/lib/auth/permissions";
import {
  isClassroomScopedUser,
  isSectionScopedAdmin,
  studentGenderFilter,
} from "@/lib/auth/section-scope";

function canManageStudentRecords(user: AuthUser): boolean {
  return (
    hasPermission(user.roles, "students:create") ||
    hasPermission(user.roles, "students:update")
  );
}

function unenrolledStudentWhere(): Prisma.StudentWhereInput {
  return { enrollments: { none: { deletedAt: null } } };
}

function unenrolledAtSchoolWhere(schoolId: string): Prisma.StudentWhereInput {
  return {
    AND: [unenrolledStudentWhere(), { originSchoolId: schoolId }],
  };
}

function unenrolledAtUserSchoolsWhere(schoolIds: string[]): Prisma.StudentWhereInput {
  return {
    AND: [unenrolledStudentWhere(), { originSchoolId: { in: schoolIds } }],
  };
}

/** Students that can be picked when creating an enrollment at a school. */
export function buildEnrollmentEligibleStudentFilter(
  user: AuthUser,
  schoolId: string
): Prisma.StudentWhereInput {
  const base: Prisma.StudentWhereInput = {
    deletedAt: null,
    isActive: true,
    ...studentGenderFilter(user),
  };

  if (user.roles.includes("SUPER_ADMIN")) {
    return {
      ...base,
      OR: [
        unenrolledStudentWhere(),
        {
          enrollments: {
            some: {
              deletedAt: null,
              schoolId,
            },
          },
        },
      ],
    };
  }

  if (user.schoolIds.includes(schoolId)) {
    return {
      ...base,
      OR: [unenrolledAtSchoolWhere(schoolId), {
        enrollments: {
          some: {
            deletedAt: null,
            schoolId,
          },
        },
      }],
    };
  }

  return { id: "00000000-0000-0000-0000-000000000000" };
}

/** Limits list/export queries to enrolled students in scope, plus unenrolled records for admins. */
export function buildStudentEnrollmentVisibilityFilter(
  user: AuthUser,
  enrollmentWhere: Prisma.StudentEnrollmentWhereInput
): Prisma.StudentWhereInput {
  if (user.roles.includes("SUPER_ADMIN")) {
    return {
      OR: [{ enrollments: { some: enrollmentWhere } }, unenrolledStudentWhere()],
    };
  }

  if (canManageStudentRecords(user) && user.schoolIds.length > 0) {
    return {
      OR: [
        { enrollments: { some: enrollmentWhere } },
        unenrolledAtUserSchoolsWhere(user.schoolIds),
      ],
    };
  }

  return { enrollments: { some: enrollmentWhere } };
}

export function buildStudentListFilter(
  user: AuthUser,
  options?: {
    search?: string;
    gender?: "MALE" | "FEMALE";
    isActive?: boolean;
  }
): Prisma.StudentWhereInput {
  const base: Prisma.StudentWhereInput = {
    deletedAt: null,
    ...studentGenderFilter(user),
    ...(options?.gender ? { gender: options.gender } : {}),
    ...(options?.isActive !== undefined ? { isActive: options.isActive } : {}),
    ...(options?.search
      ? {
          OR: [
            { firstName: { contains: options.search, mode: "insensitive" } },
            { lastName: { contains: options.search, mode: "insensitive" } },
            { studentNumber: { contains: options.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  if (user.roles.includes("SUPER_ADMIN")) {
    return base;
  }

  const primaryRole = getPrimaryRole(user.roles);

  if (primaryRole === "SCHOOL_ADMIN" && user.schoolIds.length > 0) {
    if (isSectionScopedAdmin(user) && user.classroomIds.length > 0) {
      return {
        ...base,
        enrollments: {
          some: {
            deletedAt: null,
            classroomId: { in: user.classroomIds },
          },
        },
      };
    }

    const schoolEnrollment: Prisma.StudentWhereInput = {
      enrollments: {
        some: {
          deletedAt: null,
          schoolId: { in: user.schoolIds },
        },
      },
    };

    return {
      ...base,
      OR: [schoolEnrollment, unenrolledAtUserSchoolsWhere(user.schoolIds)],
    };
  }

  if (primaryRole === "TEACHER" && user.classroomIds.length > 0) {
    return {
      ...base,
      enrollments: {
        some: {
          deletedAt: null,
          classroomId: { in: user.classroomIds },
        },
      },
    };
  }

  if (user.schoolIds.length > 0) {
    return {
      ...base,
      enrollments: {
        some: {
          deletedAt: null,
          schoolId: { in: user.schoolIds },
        },
      },
    };
  }

  return { id: "00000000-0000-0000-0000-000000000000" };
}

export async function assertStudentAccess(
  user: AuthUser,
  studentId: string
): Promise<boolean> {
  if (user.roles.includes("SUPER_ADMIN")) return true;

  const { prisma } = await import("@/lib/prisma");

  if (canManageStudentRecords(user) && user.schoolIds.length > 0) {
    const unenrolled = await prisma.student.findFirst({
      where: {
        id: studentId,
        deletedAt: null,
        ...unenrolledAtUserSchoolsWhere(user.schoolIds),
        ...studentGenderFilter(user),
      },
    });
    if (unenrolled) return true;
  }

  if (user.roles.includes("SUPER_ADMIN")) {
    const unenrolled = await prisma.student.findFirst({
      where: {
        id: studentId,
        deletedAt: null,
        ...unenrolledStudentWhere(),
      },
    });
    if (unenrolled) return true;
  }

  if (isClassroomScopedUser(user)) {
    const match = await prisma.studentEnrollment.findFirst({
      where: {
        studentId,
        deletedAt: null,
        classroomId: { in: user.classroomIds },
      },
    });
    return !!match;
  }

  if (user.schoolIds.length > 0) {
    const match = await prisma.studentEnrollment.findFirst({
      where: {
        studentId,
        deletedAt: null,
        schoolId: { in: user.schoolIds },
      },
    });
    return !!match;
  }

  return false;
}
