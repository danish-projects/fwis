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
  enrollmentWhere: Prisma.StudentEnrollmentWhereInput,
  listSchoolId?: string | null
): Prisma.StudentWhereInput {
  if (user.roles.includes("SUPER_ADMIN")) {
    if (listSchoolId) {
      return {
        OR: [
          { enrollments: { some: enrollmentWhere } },
          unenrolledAtSchoolWhere(listSchoolId),
        ],
      };
    }

    return {
      OR: [{ enrollments: { some: enrollmentWhere } }, unenrolledStudentWhere()],
    };
  }

  if (canManageStudentRecords(user) && user.schoolIds.length > 0) {
    const schoolIds = listSchoolId ? [listSchoolId] : user.schoolIds;
    return {
      OR: [
        { enrollments: { some: enrollmentWhere } },
        unenrolledAtUserSchoolsWhere(schoolIds),
      ],
    };
  }

  return { enrollments: { some: enrollmentWhere } };
}

/** Merge list filters with enrollment visibility (avoids clobbering nested OR clauses). */
export function mergeStudentQueryFilters(
  listFilter: Prisma.StudentWhereInput,
  visibilityFilter: Prisma.StudentWhereInput
): Prisma.StudentWhereInput {
  return combineStudentWhere(listFilter, visibilityFilter);
}

function studentSearchWhere(search?: string): Prisma.StudentWhereInput | null {
  const term = search?.trim();
  if (!term) return null;

  const contains = (value: string) =>
    ({ contains: value, mode: "insensitive" as const });

  const tokens = term.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    const [first, ...rest] = tokens;
    const last = rest.join(" ");
    return {
      OR: [
        {
          AND: [
            { firstName: contains(first) },
            { lastName: contains(last) },
          ],
        },
        { firstName: contains(term) },
        { lastName: contains(term) },
        { studentNumber: contains(term) },
      ],
    };
  }

  return {
    OR: [
      { firstName: contains(term) },
      { lastName: contains(term) },
      { studentNumber: contains(term) },
    ],
  };
}

function combineStudentWhere(
  ...parts: Array<Prisma.StudentWhereInput | null | undefined>
): Prisma.StudentWhereInput {
  const clauses = parts.filter(
    (part): part is Prisma.StudentWhereInput =>
      part != null && Object.keys(part).length > 0
  );
  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0];
  return { AND: clauses };
}

export function buildStudentListFilter(
  user: AuthUser,
  options?: {
    search?: string;
    gender?: "MALE" | "FEMALE";
    isActive?: boolean;
    listSchoolId?: string | null;
  }
): Prisma.StudentWhereInput {
  const base: Prisma.StudentWhereInput = {
    deletedAt: null,
    ...studentGenderFilter(user),
    ...(options?.gender ? { gender: options.gender } : {}),
    ...(options?.isActive !== undefined ? { isActive: options.isActive } : {}),
  };

  const searchWhere = studentSearchWhere(options?.search);

  if (user.roles.includes("SUPER_ADMIN")) {
    if (options?.listSchoolId) {
      return combineStudentWhere(base, searchWhere, {
        OR: [
          {
            enrollments: {
              some: {
                deletedAt: null,
                schoolId: options.listSchoolId,
              },
            },
          },
          unenrolledAtSchoolWhere(options.listSchoolId),
        ],
      });
    }

    return combineStudentWhere(base, searchWhere);
  }

  const primaryRole = getPrimaryRole(user.roles);
  const schoolIds = options?.listSchoolId
    ? [options.listSchoolId]
    : user.schoolIds;

  if (primaryRole === "SCHOOL_ADMIN" && schoolIds.length > 0) {
    if (isSectionScopedAdmin(user) && user.classroomIds.length > 0) {
      return combineStudentWhere(base, searchWhere, {
        enrollments: {
          some: {
            deletedAt: null,
            classroomId: { in: user.classroomIds },
          },
        },
      });
    }

    return combineStudentWhere(base, searchWhere, {
      OR: [
        {
          enrollments: {
            some: {
              deletedAt: null,
              schoolId: { in: schoolIds },
            },
          },
        },
        unenrolledAtUserSchoolsWhere(schoolIds),
      ],
    });
  }

  if (primaryRole === "TEACHER" && user.classroomIds.length > 0) {
    return combineStudentWhere(base, searchWhere, {
      enrollments: {
        some: {
          deletedAt: null,
          classroomId: { in: user.classroomIds },
        },
      },
    });
  }

  if (schoolIds.length > 0) {
    return combineStudentWhere(base, searchWhere, {
      enrollments: {
        some: {
          deletedAt: null,
          schoolId: { in: schoolIds },
        },
      },
    });
  }

  return combineStudentWhere(base, searchWhere, {
    id: "00000000-0000-0000-0000-000000000000",
  });
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
