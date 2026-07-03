import { Prisma } from "@prisma/client";
import type { GenderCode } from "@/lib/setup-types";
import { sectionNameForGender } from "@/lib/teachers/gender-section";
import type { AuthUser } from "@/lib/auth/session";

const NO_ACCESS_ID = "00000000-0000-0000-0000-000000000000";

export function isSectionScopedAdmin(user: AuthUser): boolean {
  return Boolean(
    user.roles.includes("SCHOOL_ADMIN") && user.gender && user.classroomIds.length > 0
  );
}

export function isClassroomScopedUser(user: AuthUser): boolean {
  if (user.roles.includes("TEACHER") && user.classroomIds.length > 0) {
    return true;
  }
  return isSectionScopedAdmin(user);
}

export function assertClassroomInScope(user: AuthUser, classroomId: string): void {
  if (user.roles.includes("SUPER_ADMIN")) return;
  if (isClassroomScopedUser(user) && !user.classroomIds.includes(classroomId)) {
    throw new Error("Unauthorized access to this grade");
  }
}

export function buildClassroomListWhere(
  user: AuthUser,
  extra: Prisma.ClassroomWhereInput = {}
): Prisma.ClassroomWhereInput {
  const base: Prisma.ClassroomWhereInput = {
    deletedAt: null,
    isActive: true,
    ...extra,
  };

  if (user.roles.includes("SUPER_ADMIN")) return base;
  if (isClassroomScopedUser(user)) {
    return { ...base, id: { in: user.classroomIds } };
  }
  if (user.schoolIds.length > 0) {
    return { ...base, schoolId: { in: user.schoolIds } };
  }
  return { ...base, id: NO_ACCESS_ID };
}

export function scopedClassroomIdFilter(
  user: AuthUser
): { id: { in: string[] } } | Record<string, never> {
  if (user.roles.includes("SUPER_ADMIN")) return {};
  if (isClassroomScopedUser(user)) {
    return { id: { in: user.classroomIds } };
  }
  return {};
}

export function buildTeacherScopeWhere(
  user: AuthUser,
  extra: Prisma.TeacherWhereInput = {}
): Prisma.TeacherWhereInput {
  if (user.roles.includes("SUPER_ADMIN")) {
    return { deletedAt: null, ...extra };
  }

  const base: Prisma.TeacherWhereInput = {
    deletedAt: null,
    schoolId: { in: user.schoolIds },
    ...extra,
  };

  if (isSectionScopedAdmin(user) && user.gender) {
    return { ...base, gender: user.gender };
  }

  if (user.schoolIds.length > 0) return base;
  return { deletedAt: null, id: NO_ACCESS_ID, ...extra };
}

export function mergeEnrollmentScope(
  user: AuthUser,
  base: Prisma.StudentEnrollmentWhereInput
): Prisma.StudentEnrollmentWhereInput {
  if (user.roles.includes("SUPER_ADMIN")) return base;

  if (isClassroomScopedUser(user)) {
    return {
      ...base,
      classroomId: base.classroomId
        ? typeof base.classroomId === "string"
          ? user.classroomIds.includes(base.classroomId)
            ? base.classroomId
            : NO_ACCESS_ID
          : base.classroomId
        : { in: user.classroomIds },
    };
  }

  if (user.schoolIds.length > 0) {
    return {
      ...base,
      schoolId: base.schoolId
        ? typeof base.schoolId === "string"
          ? user.schoolIds.includes(base.schoolId)
            ? base.schoolId
            : NO_ACCESS_ID
          : base.schoolId
        : { in: user.schoolIds },
    };
  }

  return { ...base, id: NO_ACCESS_ID };
}

export function studentGenderFilter(user: AuthUser): Prisma.StudentWhereInput {
  if (isSectionScopedAdmin(user) && user.gender) {
    return { gender: user.gender };
  }
  return {};
}

export async function resolveSectionScopedClassroomIds(
  schoolIds: string[],
  gender: GenderCode
): Promise<string[]> {
  const { prisma } = await import("@/lib/prisma");
  const sectionName = sectionNameForGender(gender);
  const classrooms = await prisma.classroom.findMany({
    where: {
      schoolId: { in: schoolIds },
      deletedAt: null,
      isActive: true,
      section: { name: sectionName },
    },
    select: { id: true },
  });
  return classrooms.map((c) => c.id);
}
