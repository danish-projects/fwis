import { Prisma } from "@prisma/client";
import type { GenderCode } from "@/lib/setup-types";
import { sectionNameForGender } from "@/lib/staff/gender-section";
import type { AuthUser } from "@/lib/auth/session";

const NO_ACCESS_ID = "00000000-0000-0000-0000-000000000000";

const SCHOOL_ADMIN_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL"] as const;
const CLASSROOM_ROLES = ["TEACHER", "SUBSTITUTE"] as const;

function isGlobalAdmin(user: AuthUser): boolean {
  return user.roles.includes("NIGRA");
}

function hasSchoolAdminRole(user: AuthUser): boolean {
  return user.roles.some((r) =>
    (SCHOOL_ADMIN_ROLES as readonly string[]).includes(r)
  );
}

export function isSectionScopedAdmin(user: AuthUser): boolean {
  return Boolean(
    hasSchoolAdminRole(user) && user.gender && user.classroomIds.length > 0
  );
}

export function isClassroomScopedUser(user: AuthUser): boolean {
  if (
    user.roles.some((r) => (CLASSROOM_ROLES as readonly string[]).includes(r)) &&
    user.classroomIds.length > 0
  ) {
    return true;
  }
  return isSectionScopedAdmin(user);
}

export function assertClassroomInScope(user: AuthUser, classroomId: string): void {
  if (isGlobalAdmin(user)) return;
  if (isClassroomScopedUser(user) && !user.classroomIds.includes(classroomId)) {
    throw new Error("Unauthorized access to this grade");
  }
}

export function buildClassroomListWhere(
  user: AuthUser,
  extra: Prisma.ClassroomWhereInput & {
    /** @deprecated Prefer schoolLinks; converted for callers still passing schoolId. */
    schoolId?: string | { in: string[] };
  } = {}
): Prisma.ClassroomWhereInput {
  const { schoolId: schoolIdFilter, schoolLinks: extraSchoolLinks, ...restExtra } =
    extra;

  function schoolLinksForIds(ids: string[]): Prisma.ClassroomWhereInput {
    return {
      schoolLinks: {
        some: {
          schoolId: ids.length === 1 ? ids[0] : { in: ids },
          deletedAt: null,
        },
      },
    };
  }

  let requestedSchoolIds: string[] | null = null;
  if (typeof schoolIdFilter === "string") {
    requestedSchoolIds = [schoolIdFilter];
  } else if (
    schoolIdFilter &&
    typeof schoolIdFilter === "object" &&
    Array.isArray(schoolIdFilter.in)
  ) {
    requestedSchoolIds = schoolIdFilter.in;
  }

  const base: Prisma.ClassroomWhereInput = {
    deletedAt: null,
    isActive: true,
    ...restExtra,
  };

  if (isGlobalAdmin(user)) {
    if (requestedSchoolIds) {
      return { ...base, ...schoolLinksForIds(requestedSchoolIds) };
    }
    if (extraSchoolLinks) {
      return { ...base, schoolLinks: extraSchoolLinks };
    }
    return base;
  }

  if (isClassroomScopedUser(user)) {
    const scoped: Prisma.ClassroomWhereInput = {
      ...base,
      id: { in: user.classroomIds },
    };
    if (requestedSchoolIds) {
      return { ...scoped, ...schoolLinksForIds(requestedSchoolIds) };
    }
    if (extraSchoolLinks) {
      return { ...scoped, schoolLinks: extraSchoolLinks };
    }
    return scoped;
  }

  if (user.schoolIds.length > 0) {
    const allowed = requestedSchoolIds
      ? requestedSchoolIds.filter((id) => user.schoolIds.includes(id))
      : user.schoolIds;
    return {
      ...base,
      ...schoolLinksForIds(
        allowed.length > 0 ? allowed : ["00000000-0000-0000-0000-000000000000"]
      ),
    };
  }

  return { ...base, id: NO_ACCESS_ID };
}

export function scopedClassroomIdFilter(
  user: AuthUser
): { id: { in: string[] } } | Record<string, never> {
  if (isGlobalAdmin(user)) return {};
  if (isClassroomScopedUser(user)) {
    return { id: { in: user.classroomIds } };
  }
  return {};
}

export function buildStaffScopeWhere(
  user: AuthUser,
  extra: Prisma.StaffWhereInput = {}
): Prisma.StaffWhereInput {
  if (isGlobalAdmin(user)) {
    return { deletedAt: null, ...extra };
  }

  const base: Prisma.StaffWhereInput = {
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
  if (isGlobalAdmin(user)) return base;

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
  if (
    user.gender &&
    (isSectionScopedAdmin(user) || user.isSubstituteTeacher)
  ) {
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
      schoolLinks: {
        some: { schoolId: { in: schoolIds }, deletedAt: null, isActive: true },
      },
      deletedAt: null,
      isActive: true,
      section: { name: sectionName },
    },
    select: { id: true },
  });
  return classrooms.map((c) => c.id);
}
