import type { PrismaClient } from "@prisma/client";
import { LOGIN_USER_ID_REGEX, toLoginUserId } from "../../src/lib/auth/login-user-id";
import { isGlobalStaffRole } from "../../src/lib/roles/ensure-role";
import { resolveRoleDefaultPassword } from "../../src/lib/school/default-login-specs";

/** @deprecated Import never creates passwords; kept for callers that display defaults. */
export const DEFAULT_TEACHER_PASSWORD = resolveRoleDefaultPassword("TEACHER");

export type EnsureStaffLoginInput = {
  staffId: string;
  /** Login handle for app_users.user_id / staff.user_id. */
  loginUserId: string;
  /** Communication email stored on the staff record. */
  email: string;
  fullName: string;
  gender: "MALE" | "FEMALE";
  schoolId: string;
  roleId: number;
};

export type EnsureStaffLoginResult = {
  created: boolean;
  linked: boolean;
  /** app_users.user_id (login handle). */
  userId: string;
};

async function ensureStaffRoleAndSchool(
  prisma: PrismaClient,
  appUserId: string,
  roleId: number,
  schoolId: string,
  isGlobalRole: boolean
): Promise<void> {
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: appUserId, roleId } },
    update: {},
    create: { userId: appUserId, roleId },
  });

  if (isGlobalRole) return;

  await prisma.userSchool.upsert({
    where: { userId_schoolId: { userId: appUserId, schoolId } },
    update: {},
    create: { userId: appUserId, schoolId },
  });
}

/**
 * Link staff to an existing app_users.user_id.
 * Never creates AppUser — logins must already exist (Create default app users).
 */
export async function ensureStaffLogin(
  prisma: PrismaClient,
  input: EnsureStaffLoginInput
): Promise<EnsureStaffLoginResult> {
  return linkStaffToExistingAppUser(prisma, input);
}

/**
 * Link staff to an existing app_users.user_id. Never creates AppUser.
 * Used by the roster import (Staff + Students).
 */
export async function linkStaffToExistingAppUser(
  prisma: PrismaClient,
  input: EnsureStaffLoginInput
): Promise<EnsureStaffLoginResult> {
  const loginUserId = toLoginUserId(input.loginUserId);
  if (!LOGIN_USER_ID_REGEX.test(loginUserId)) {
    throw new Error(
      `Invalid teacher user_id "${input.loginUserId}". Use 2–64 chars: letters, digits, dots, underscores, hyphens.`
    );
  }

  const role = await prisma.role.findUnique({ where: { id: input.roleId } });
  if (!role) {
    throw new Error(`Role id ${input.roleId} not found. Run npm run db:seed first.`);
  }

  const appUser = await prisma.appUser.findUnique({
    where: { userId: loginUserId },
    select: { id: true, userId: true, isActive: true },
  });
  if (!appUser) {
    throw new Error(
      `App user "${loginUserId}" was not found. ` +
        `Import never creates logins — create default school users in the app before importing.`
    );
  }
  if (!appUser.isActive) {
    throw new Error(`App user "${loginUserId}" is inactive.`);
  }

  // One login may be linked to multiple staff records (e.g. across schools).
  const isGlobalRole = isGlobalStaffRole(role.code);
  await ensureStaffRoleAndSchool(
    prisma,
    appUser.id,
    role.id,
    input.schoolId,
    isGlobalRole
  );

  const staff = await prisma.staff.findUnique({
    where: { id: input.staffId },
    select: { userId: true },
  });
  if (!staff) {
    throw new Error(`Staff member ${input.staffId} not found.`);
  }

  if (staff.userId && staff.userId !== loginUserId) {
    throw new Error(
      `Staff member is already linked to "${staff.userId}", not "${loginUserId}".`
    );
  }

  if (!staff.userId) {
    await prisma.staff.update({
      where: { id: input.staffId },
      data: { userId: loginUserId },
    });
    return { created: false, linked: true, userId: loginUserId };
  }

  // Already linked to this login — leave unchanged.
  return { created: false, linked: false, userId: loginUserId };
}
