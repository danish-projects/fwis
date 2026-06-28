import { UserRoleCode } from "@prisma/client";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  getPrimaryRole,
  hasPermission,
  type Permission,
} from "@/lib/auth/permissions";
import type { GenderCode } from "@/lib/setup-types";
import { resolveSectionScopedClassroomIds } from "@/lib/auth/section-scope";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  roles: UserRoleCode[];
  schoolIds: string[];
  gender: GenderCode | null;
  teacherId?: string;
  classroomIds: string[];
};

export async function getSessionUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const appUser = await prisma.appUser.findUnique({
    where: { id: user.id },
    include: {
      roles: { include: { role: true } },
      schools: true,
      teacher: { include: { classrooms: true } },
    },
  });

  if (!appUser || !appUser.isActive) return null;

  const roles = appUser.roles.map((r) => r.role.code);
  const schoolIds = appUser.schools.map((s) => s.schoolId);
  const gender = (appUser.gender as GenderCode | null) ?? null;

  let classroomIds =
    appUser.teacher?.classrooms.map((c) => c.classroomId) ?? [];

  if (
    classroomIds.length === 0 &&
    roles.includes("SCHOOL_ADMIN") &&
    gender &&
    schoolIds.length > 0
  ) {
    classroomIds = await resolveSectionScopedClassroomIds(schoolIds, gender);
  }

  return {
    id: appUser.id,
    email: appUser.email,
    fullName: appUser.fullName,
    roles,
    schoolIds,
    gender,
    teacherId: appUser.teacher?.id,
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
    !user.roles.includes("SUPER_ADMIN") &&
    !user.schoolIds.includes(context.schoolId)
  ) {
    redirect("/unauthorized");
  }

  return user;
}

export async function requireRole(...roles: UserRoleCode[]): Promise<AuthUser> {
  const user = await requireUser();
  const primary = getPrimaryRole(user.roles);
  if (!roles.includes(primary) && !user.roles.includes("SUPER_ADMIN")) {
    redirect("/unauthorized");
  }
  return user;
}

export function canAccessSchool(user: AuthUser, schoolId: string): boolean {
  if (user.roles.includes("SUPER_ADMIN")) return true;
  return user.schoolIds.includes(schoolId);
}
