import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../src/lib/auth/password";
import { LOGIN_USER_ID_REGEX, toLoginUserId } from "../../src/lib/auth/login-user-id";
import { isGlobalStaffRole } from "../../src/lib/roles/ensure-role";

import { resolveRoleDefaultPassword } from "../../src/lib/school/default-login-specs";

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

export async function ensureStaffLogin(
  prisma: PrismaClient,
  input: EnsureStaffLoginInput
): Promise<EnsureStaffLoginResult> {
  const loginUserId = toLoginUserId(input.loginUserId);
  if (!LOGIN_USER_ID_REGEX.test(loginUserId)) {
    throw new Error(
      `Invalid staff user_id "${input.loginUserId}". Use 2–64 chars: letters, digits, dots, underscores, hyphens.`
    );
  }

  const role = await prisma.role.findUnique({
    where: { id: input.roleId },
  });
  if (!role) {
    throw new Error(`Role id ${input.roleId} not found. Run npm run db:seed first.`);
  }

  const isGlobalRole = isGlobalStaffRole(role.code);

  const staff = await prisma.staff.findUnique({
    where: { id: input.staffId },
    select: { userId: true },
  });
  if (!staff) {
    throw new Error(`Staff member ${input.staffId} not found.`);
  }

  if (staff.userId) {
    const linkedUser = await prisma.appUser.findUnique({
      where: { userId: staff.userId },
      select: { id: true },
    });
    if (!linkedUser) {
      throw new Error(
        `Staff member is linked to missing login "${staff.userId}".`
      );
    }
    await ensureStaffRoleAndSchool(
      prisma,
      linkedUser.id,
      role.id,
      input.schoolId,
      isGlobalRole
    );
    return { created: false, linked: false, userId: staff.userId };
  }

  let appUser = await prisma.appUser.findUnique({
    where: { userId: loginUserId },
  });
  let created = false;

  if (!appUser) {
    const passwordHash = await hashPassword(DEFAULT_TEACHER_PASSWORD);
    appUser = await prisma.appUser.create({
      data: {
        id: randomUUID(),
        userId: loginUserId,
        passwordHash,
        fullName: input.fullName,
        gender: input.gender,
        isActive: true,
      },
    });
    created = true;
  } else {
    const otherStaff = await prisma.staff.findFirst({
      where: { userId: loginUserId, id: { not: input.staffId } },
      select: { id: true },
    });
    if (otherStaff) {
      throw new Error(
        `Login "${loginUserId}" is already linked to a different staff record.`
      );
    }
  }

  await ensureStaffRoleAndSchool(
    prisma,
    appUser.id,
    role.id,
    input.schoolId,
    isGlobalRole
  );

  const linkResult = await prisma.staff.updateMany({
    where: { id: input.staffId, userId: null },
    data: { userId: loginUserId },
  });

  return {
    created,
    linked: linkResult.count > 0,
    userId: loginUserId,
  };
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
      `App user "${loginUserId}" was not found. Create the login in the app before importing.`
    );
  }
  if (!appUser.isActive) {
    throw new Error(`App user "${loginUserId}" is inactive.`);
  }

  const otherStaff = await prisma.staff.findFirst({
    where: { userId: loginUserId, id: { not: input.staffId } },
    select: { id: true },
  });
  if (otherStaff) {
    throw new Error(
      `Login "${loginUserId}" is already linked to a different staff record.`
    );
  }

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

  return { created: false, linked: false, userId: loginUserId };
}
