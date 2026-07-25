import type { PrismaClient, UserRoleCode } from "@prisma/client";
import type { GenderCode } from "@/lib/setup-types";
import { toLoginUserId } from "@/lib/auth/login-user-id";
import {
  resolveRoleDefaultPassword,
  ROLE_DEFAULT_PASSWORDS,
} from "@/lib/school/default-login-specs";

export type DemoAuthUser = {
  id: string;
  userId: string;
  password: string;
  fullName: string;
  roles: UserRoleCode[];
  schoolCity?: string;
  gender?: GenderCode;
  linkTeacherEmail?: string;
};

export const SUPER_ADMIN_ID = "00000000-0000-4000-8000-000000000001";

/** Demo login accounts for local development scripts (Houston HOU code). */
const DEMO_AUTH_USERS_RAW: DemoAuthUser[] = [
  {
    id: SUPER_ADMIN_ID,
    userId: "majlis",
    password: resolveRoleDefaultPassword("NIGRA"),
    fullName: "FWIS Nigran",
    roles: ["NIGRA"],
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    userId: "hou.principal",
    password: ROLE_DEFAULT_PASSWORDS.PRINCIPAL,
    fullName: "Houston Principal",
    roles: ["PRINCIPAL"],
    schoolCity: "Houston",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    userId: "hou.m.admin",
    password: ROLE_DEFAULT_PASSWORDS.SCHOOL_ADMIN,
    fullName: "Houston Boys Admin",
    roles: ["SCHOOL_ADMIN"],
    schoolCity: "Houston",
    gender: "MALE",
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    userId: "hou.f.admin",
    password: ROLE_DEFAULT_PASSWORDS.SCHOOL_ADMIN,
    fullName: "Houston Girls Admin",
    roles: ["SCHOOL_ADMIN"],
    schoolCity: "Houston",
    gender: "FEMALE",
  },
  {
    id: "00000000-0000-4000-8000-000000000005",
    userId: "hou.b.g1",
    password: ROLE_DEFAULT_PASSWORDS.TEACHER,
    fullName: "Houston Grade 1 Boys Teacher",
    roles: ["TEACHER"],
    schoolCity: "Houston",
    gender: "MALE",
    linkTeacherEmail: "hou.b.g1",
  },
  {
    id: "00000000-0000-4000-8000-000000000006",
    userId: "hou.g.g1",
    password: ROLE_DEFAULT_PASSWORDS.TEACHER,
    fullName: "Houston Grade 1 Girls Teacher",
    roles: ["TEACHER"],
    schoolCity: "Houston",
    gender: "FEMALE",
    linkTeacherEmail: "hou.g.g1",
  },
  {
    id: "00000000-0000-4000-8000-000000000007",
    userId: "hou.m.sub",
    password: ROLE_DEFAULT_PASSWORDS.SUBSTITUTE,
    fullName: "Houston Boys Substitute",
    roles: ["SUBSTITUTE"],
    schoolCity: "Houston",
    gender: "MALE",
  },
  {
    id: "00000000-0000-4000-8000-000000000008",
    userId: "hou.f.sub",
    password: ROLE_DEFAULT_PASSWORDS.SUBSTITUTE,
    fullName: "Houston Girls Substitute",
    roles: ["SUBSTITUTE"],
    schoolCity: "Houston",
    gender: "FEMALE",
  },
];

export const DEMO_AUTH_USERS: DemoAuthUser[] = DEMO_AUTH_USERS_RAW.map((demo) => ({
  ...demo,
  userId: toLoginUserId(demo.userId),
  linkTeacherEmail: demo.linkTeacherEmail
    ? toLoginUserId(demo.linkTeacherEmail)
    : undefined,
}));

export async function seedDemoAppUsers(
  prisma: PrismaClient,
  schools: Array<{ id: string; city: string }>,
  roles: Array<{ id: number; code: UserRoleCode }>
) {
  for (const demo of DEMO_AUTH_USERS) {
    await prisma.appUser.upsert({
      where: { id: demo.id },
      update: {
        userId: demo.userId,
        fullName: demo.fullName,
        gender: demo.gender ?? null,
        isActive: true,
      },
      create: {
        id: demo.id,
        userId: demo.userId,
        fullName: demo.fullName,
        gender: demo.gender ?? null,
        isActive: true,
      },
    });

    for (const roleCode of demo.roles) {
      const role = roles.find((r) => r.code === roleCode);
      if (!role) continue;

      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: demo.id, roleId: role.id } },
        update: {},
        create: { userId: demo.id, roleId: role.id },
      });
    }

    if (demo.schoolCity) {
      const school = schools.find((s) => s.city === demo.schoolCity);
      if (school) {
        await prisma.userSchool.upsert({
          where: {
            userId_schoolId: { userId: demo.id, schoolId: school.id },
          },
          update: {},
          create: { userId: demo.id, schoolId: school.id },
        });
      }
    }

    if (demo.linkTeacherEmail && demo.schoolCity) {
      const school = schools.find((s) => s.city === demo.schoolCity);
      if (school) {
        await prisma.staff.updateMany({
          where: {
            schoolId: school.id,
            email: demo.linkTeacherEmail,
            deletedAt: null,
          },
          data: { userId: demo.userId },
        });
      }
    }
  }
}
