import { UserRoleCode } from "@prisma/client";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  getPrimaryRole,
  hasPermission,
  type Permission,
} from "@/lib/auth/permissions";
import type { GenderCode } from "@/lib/setup-types";
import { resolveSectionScopedClassroomIds } from "@/lib/auth/section-scope";
import { parseSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";
import { ACADEMIC_YEAR_COOKIE } from "@/lib/academic-year/constants";
import { canSwitchAcademicYear } from "@/lib/academic-year/can-switch-year";
import { findCurrentAcademicYearSchoolForSchool } from "@/lib/academic-year/find-current-year";

export type AuthUser = {
  id: string;
  /** Login handle (app_users.user_id), not an email address. */
  userId: string;
  fullName: string | null;
  /** Staff first + last when linked; prefer this for sidebar display. */
  staffFullName: string | null;
  roles: UserRoleCode[];
  schoolIds: string[];
  gender: GenderCode | null;
  staffId?: string;
  /** Year-scoped staff position code from StaffAssignment (selected year). */
  staffRoleCode?: string;
  isSubstituteTeacher: boolean;
  classroomIds: string[];
};

async function resolveSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = await parseSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  return session?.userId ?? null;
}

/** Resolve academic_year_school ids for session classroom scoping. */
async function resolveYearSchoolIdsForSession(
  schoolIds: string[],
  roles: UserRoleCode[]
): Promise<string[]> {
  if (schoolIds.length === 0) return [];

  // Teachers / substitutes: always current school year.
  if (!canSwitchAcademicYear(roles)) {
    const current = await Promise.all(
      schoolIds.map((schoolId) => findCurrentAcademicYearSchoolForSchool(schoolId))
    );
    return current.filter(Boolean).map((link) => link!.id);
  }

  const cookieStore = await cookies();
  const cookieYearId = cookieStore.get(ACADEMIC_YEAR_COOKIE)?.value;

  if (cookieYearId) {
    const links = await prisma.academicYearSchool.findMany({
      where: {
        schoolId: { in: schoolIds },
        academicYearId: cookieYearId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (links.length > 0) return links.map((l) => l.id);
  }

  const current = await Promise.all(
    schoolIds.map((schoolId) => findCurrentAcademicYearSchoolForSchool(schoolId))
  );
  return current.filter(Boolean).map((link) => link!.id);
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const userId = await resolveSessionUserId();
  if (!userId) return null;

  const appUser = await prisma.appUser.findUnique({
    where: { id: userId },
    include: {
      roles: { include: { role: true } },
      schools: true,
      staff: {
        where: { deletedAt: null },
        include: {
          assignments: {
            include: { role: true },
          },
        },
      },
    },
  });

  if (!appUser || !appUser.isActive) return null;

  const roles = appUser.roles.map((r) => r.role.code);
  const schoolIds = appUser.schools.map((s) => s.schoolId);
  const gender = (appUser.gender as GenderCode | null) ?? null;

  const yearSchoolIds = await resolveYearSchoolIdsForSession(schoolIds, roles);
  const linkedStaff = appUser.staff ?? [];
  const yearAssignments = linkedStaff.flatMap((s) =>
    s.assignments.filter((a) => yearSchoolIds.includes(a.academicYearSchoolId))
  );

  const staffRoleCode = yearAssignments[0]?.role.code;
  const isSubstituteTeacher = staffRoleCode === "SUBSTITUTE";

  let classroomIds = yearAssignments
    .map((a) => a.classroomId)
    .filter((id): id is string => Boolean(id));

  // Prefer staff at one of the user's schools for display / primary staffId.
  const primaryStaff =
    linkedStaff.find((s) => schoolIds.includes(s.schoolId)) ?? linkedStaff[0];

  // Substitute teachers (and gendered school admins without a linked classroom)
  // see every grade in their Boys/Girls section.
  if (
    gender &&
    schoolIds.length > 0 &&
    (isSubstituteTeacher ||
      (classroomIds.length === 0 &&
        roles.some((r) => ["SCHOOL_ADMIN", "PRINCIPAL"].includes(r))))
  ) {
    classroomIds = await resolveSectionScopedClassroomIds(schoolIds, gender);
  }

  const staffFullName = primaryStaff
    ? [primaryStaff.firstName, primaryStaff.lastName]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(" ") || null
    : null;

  return {
    id: appUser.id,
    userId: appUser.userId,
    fullName: appUser.fullName,
    staffFullName,
    roles,
    schoolIds,
    gender,
    staffId: primaryStaff?.id,
    staffRoleCode,
    isSubstituteTeacher,
    classroomIds,
  };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePermission(
  permission: Permission,
  context?: { schoolId?: string }
): Promise<AuthUser> {
  const user = await requireUser();

  if (!hasPermission(user.roles, permission)) {
    redirect("/unauthorized");
  }

  if (
    context?.schoolId &&
    !user.roles.includes("NIGRA") &&
    !user.schoolIds.includes(context.schoolId)
  ) {
    redirect("/unauthorized");
  }

  return user;
}

export async function requireRole(...roles: UserRoleCode[]): Promise<AuthUser> {
  const user = await requireUser();
  const primary = getPrimaryRole(user.roles);
  if (!roles.includes(primary) && !user.roles.includes("NIGRA")) {
    redirect("/unauthorized");
  }
  return user;
}

export function canAccessSchool(user: AuthUser, schoolId: string): boolean {
  if (user.roles.includes("NIGRA")) return true;
  return user.schoolIds.includes(schoolId);
}
