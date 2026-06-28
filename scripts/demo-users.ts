import type { PrismaClient, UserRoleCode } from "@prisma/client";
import type { GenderCode } from "@/lib/setup-types";

export type DemoAuthUser = {
  id: string;
  email: string;
  password: string;
  fullName: string;
  roles: UserRoleCode[];
  schoolCity?: string;
  gender?: GenderCode;
  linkTeacherEmail?: string;
};

export const SUPER_ADMIN_ID = "00000000-0000-4000-8000-000000000001";

const SCHOOL_SLUGS = [
  { city: "Houston", slug: "houston" },
  { city: "Chicago", slug: "chicago" },
  { city: "New York", slug: "newyork" },
  { city: "Dallas", slug: "dallas" },
  { city: "Atlanta", slug: "atlanta" },
] as const;

function demoUserId(counter: number) {
  return `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`;
}

function buildSectionAdminUsers(): DemoAuthUser[] {
  const users: DemoAuthUser[] = [];
  let counter = 4;

  for (const school of SCHOOL_SLUGS) {
    users.push({
      id: demoUserId(counter++),
      email: `admin.m.${school.slug}@fwis.org`,
      password: "FwisAdmin786!",
      fullName: `${school.city} Boys Admin`,
      roles: ["SCHOOL_ADMIN"],
      schoolCity: school.city,
      gender: "MALE",
    });
    users.push({
      id: demoUserId(counter++),
      email: `admin.f.${school.slug}@fwis.org`,
      password: "FwisAdmin786!",
      fullName: `${school.city} Girls Admin`,
      roles: ["SCHOOL_ADMIN"],
      schoolCity: school.city,
      gender: "FEMALE",
    });
  }

  return users;
}

/** Demo login accounts — IDs must match Supabase Auth user UUIDs. */
export const DEMO_AUTH_USERS: DemoAuthUser[] = [
  {
    id: SUPER_ADMIN_ID,
    email: "superadmin@fwis.org",
    password: "FwisAdmin786!",
    fullName: "FWIS Super Admin",
    roles: ["SUPER_ADMIN"],
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    email: "admin.houston@fwis.org",
    password: "FwisAdmin786!",
    fullName: "Br. Ahmed Khan",
    roles: ["SCHOOL_ADMIN"],
    schoolCity: "Houston",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    email: "grade1.boys.houston@fwis.org",
    password: "FwisTeacher786!",
    fullName: "Muhammad Usman Khan",
    roles: ["TEACHER"],
    schoolCity: "Houston",
    linkTeacherEmail: "grade1.boys.houston@fwis.org",
  },
  ...buildSectionAdminUsers(),
];

export async function seedDemoAppUsers(
  prisma: PrismaClient,
  schools: Array<{ id: string; city: string }>,
  roles: Array<{ id: number; code: UserRoleCode }>
) {
  for (const demo of DEMO_AUTH_USERS) {
    await prisma.appUser.upsert({
      where: { id: demo.id },
      update: {
        email: demo.email,
        fullName: demo.fullName,
        gender: demo.gender ?? null,
        isActive: true,
      },
      create: {
        id: demo.id,
        email: demo.email,
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
        await prisma.teacher.updateMany({
          where: {
            schoolId: school.id,
            email: demo.linkTeacherEmail,
            deletedAt: null,
          },
          data: { userId: demo.id },
        });
      }
    }
  }
}
