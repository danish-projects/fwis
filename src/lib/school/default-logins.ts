import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";
import {
  buildSchoolDefaultLoginSpecs,
  defaultSchoolPasswordsByRole,
  type SchoolDefaultLoginRole,
} from "@/lib/school/default-login-specs";

export type EnsureSchoolDefaultLoginsResult = {
  created: number;
  existing: number;
  logins: string[];
  /** Password used for each role in this batch. */
  passwordsByRole: Record<SchoolDefaultLoginRole, string>;
};

export async function ensureSchoolDefaultLogins(
  prisma: PrismaClient,
  options: {
    schoolId: string;
    cityCode: string;
    city?: string;
  }
): Promise<EnsureSchoolDefaultLoginsResult> {
  const specs = buildSchoolDefaultLoginSpecs({
    cityCode: options.cityCode,
    cityLabel: options.city,
  });
  const passwordsByRole = defaultSchoolPasswordsByRole();

  const passwordHashByRole = new Map<SchoolDefaultLoginRole, string>();
  for (const role of Object.keys(passwordsByRole) as SchoolDefaultLoginRole[]) {
    passwordHashByRole.set(role, await hashPassword(passwordsByRole[role]));
  }

  const roleRows = await prisma.role.findMany({
    where: {
      code: { in: ["PRINCIPAL", "SCHOOL_ADMIN", "TEACHER", "SUBSTITUTE"] },
    },
  });
  const roleByCode = new Map(roleRows.map((r) => [r.code, r]));

  for (const code of ["PRINCIPAL", "SCHOOL_ADMIN", "TEACHER", "SUBSTITUTE"] as const) {
    if (!roleByCode.has(code)) {
      throw new Error(`Role "${code}" not found. Run npm run db:seed first.`);
    }
  }

  let created = 0;
  let existing = 0;
  const logins: string[] = [];

  for (const spec of specs) {
    logins.push(spec.loginUserId);
    const role = roleByCode.get(spec.roleCode)!;
    const passwordHash = passwordHashByRole.get(spec.roleCode)!;

    let appUser = await prisma.appUser.findUnique({
      where: { userId: spec.loginUserId },
    });

    if (!appUser) {
      appUser = await prisma.appUser.create({
        data: {
          id: randomUUID(),
          userId: spec.loginUserId,
          passwordHash,
          fullName: spec.fullName,
          gender: spec.gender,
          isActive: true,
        },
      });
      created++;
    } else {
      await prisma.appUser.update({
        where: { id: appUser.id },
        data: {
          fullName: spec.fullName,
          gender: spec.gender,
          isActive: true,
        },
      });
      existing++;
    }

    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: appUser.id, roleId: role.id },
      },
      update: {},
      create: { userId: appUser.id, roleId: role.id },
    });

    await prisma.userSchool.upsert({
      where: {
        userId_schoolId: {
          userId: appUser.id,
          schoolId: options.schoolId,
        },
      },
      update: {},
      create: { userId: appUser.id, schoolId: options.schoolId },
    });
  }

  return { created, existing, logins, passwordsByRole };
}
