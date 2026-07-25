import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../src/lib/auth/password";
import { toLoginUserId } from "../../src/lib/auth/login-user-id";
import { ensureRoleByCode, isGlobalStaffRole } from "../../src/lib/roles/ensure-role";
import type { StaffPositionCode } from "../../src/lib/roles/staff-positions";
import {
  buildSchoolDefaultLoginSpecs,
  resolveRoleDefaultPassword,
  SCHOOL_DEFAULT_TEACHER_GRADES,
  type SchoolDefaultLoginSpec,
} from "../../src/lib/school/default-login-specs";

const HOUSTON_CITY = "houston";
const HOUSTON_CITY_CODE = "HOU";

export type ClassroomResolver = (
  grade: number,
  section: "Boys" | "Girls"
) => Promise<{ id: string }>;

type HoustonAdminSpec = SchoolDefaultLoginSpec & {
  /** Stored on staff.email for grade-scoped accounts. */
  teacherEmail: string;
  grade?: number;
  section?: "Boys" | "Girls";
};

export type EnsureHoustonAdminLoginsResult = {
  processed: number;
  created: number;
  linked: number;
  skipped: number;
};

export function isHoustonSchool(city: string): boolean {
  return city.trim().toLowerCase() === HOUSTON_CITY;
}

/** Houston default logins: principal, admins, G1–G6 teachers (no substitutes). */
export function buildHoustonAdminSpecs(): HoustonAdminSpec[] {
  const specs = buildSchoolDefaultLoginSpecs({
    cityCode: HOUSTON_CITY_CODE,
    cityLabel: "Houston",
  }).filter((spec) => spec.roleCode !== "SUBSTITUTE");

  return specs.map((spec) => {
    const gradeMatch = spec.loginUserId.match(/\.([bg])\.g(\d+)$/);
    let grade: number | undefined;
    let section: "Boys" | "Girls" | undefined;
    if (gradeMatch) {
      section = gradeMatch[1] === "b" ? "Boys" : "Girls";
      grade = Number(gradeMatch[2]);
    }

    return {
      ...spec,
      teacherEmail: toLoginUserId(spec.loginUserId),
      grade,
      section,
    };
  });
}

async function ensureStaffRoleAndSchool(
  prisma: PrismaClient,
  userId: string,
  roleId: number,
  schoolId: string,
  roleCode: string
): Promise<void> {
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId } },
    update: {},
    create: { userId, roleId },
  });

  if (!isGlobalStaffRole(roleCode)) {
    await prisma.userSchool.upsert({
      where: { userId_schoolId: { userId, schoolId } },
      update: {},
      create: { userId, schoolId },
    });
  }
}

async function ensureGradeScopeTeacher(
  prisma: PrismaClient,
  schoolId: string,
  academicYearSchoolId: string,
  spec: HoustonAdminSpec,
  resolveClassroom: ClassroomResolver
): Promise<{ staffId: string; roleId: number }> {
  if (!spec.grade || !spec.section || !spec.gender) {
    throw new Error(`Grade teacher spec missing grade/section: ${spec.loginUserId}`);
  }

  const role = await ensureRoleByCode(prisma, spec.roleCode);
  const classroom = await resolveClassroom(spec.grade, spec.section);
  const email = spec.teacherEmail;
  const [firstName, ...rest] = spec.fullName.split(" ");
  const lastName = rest.join(" ") || "Teacher";

  const staff = await prisma.staff.upsert({
    where: {
      schoolId_email: { schoolId, email },
    },
    update: {
      gender: spec.gender,
      firstName,
      lastName,
      isActive: true,
      deletedAt: null,
    },
    create: {
      schoolId,
      email,
      gender: spec.gender,
      firstName,
      lastName,
      isActive: true,
    },
  });

  await prisma.staffAssignment.upsert({
    where: {
      staffId_academicYearSchoolId: {
        staffId: staff.id,
        academicYearSchoolId,
      },
    },
    update: {
      roleId: role.id,
      classroomId: classroom.id,
    },
    create: {
      staffId: staff.id,
      academicYearSchoolId,
      roleId: role.id,
      classroomId: classroom.id,
    },
  });

  return { staffId: staff.id, roleId: role.id };
}

async function ensureHoustonAdminLogin(
  prisma: PrismaClient,
  schoolId: string,
  academicYearSchoolId: string,
  spec: HoustonAdminSpec,
  resolveClassroom: ClassroomResolver
): Promise<{ created: boolean; linked: boolean; userId: string }> {
  const loginUserId = spec.loginUserId;
  const role = await ensureRoleByCode(prisma, spec.roleCode as StaffPositionCode);
  let staffId: string | null = null;

  if (spec.grade && spec.section) {
    const scoped = await ensureGradeScopeTeacher(
      prisma,
      schoolId,
      academicYearSchoolId,
      spec,
      resolveClassroom
    );
    staffId = scoped.staffId;
  } else {
    const email = spec.teacherEmail;
    const existing = await prisma.staff.findUnique({
      where: { schoolId_email: { schoolId, email } },
    });
    if (existing) {
      staffId = existing.id;
      await prisma.staffAssignment.upsert({
        where: {
          staffId_academicYearSchoolId: {
            staffId: existing.id,
            academicYearSchoolId,
          },
        },
        update: { roleId: role.id, classroomId: null },
        create: {
          staffId: existing.id,
          academicYearSchoolId,
          roleId: role.id,
          classroomId: null,
        },
      });
    }
  }

  let appUser = await prisma.appUser.findUnique({ where: { userId: loginUserId } });
  let created = false;

  if (!appUser) {
    const id = randomUUID();
    const passwordHash = await hashPassword(
      resolveRoleDefaultPassword(spec.roleCode)
    );
    appUser = await prisma.appUser.create({
      data: {
        id,
        userId: loginUserId,
        passwordHash,
        fullName: spec.fullName,
        gender: spec.gender ?? null,
        isActive: true,
      },
    });
    created = true;
  } else if (spec.gender) {
    await prisma.appUser.update({
      where: { id: appUser.id },
      data: { gender: spec.gender, fullName: spec.fullName },
    });
  } else {
    await prisma.appUser.update({
      where: { id: appUser.id },
      data: { fullName: spec.fullName, gender: null },
    });
  }

  await ensureStaffRoleAndSchool(
    prisma,
    appUser.id,
    role.id,
    schoolId,
    role.code
  );

  let linked = false;
  if (staffId) {
    const otherStaff = await prisma.staff.findFirst({
      where: {
        userId: loginUserId,
        id: { not: staffId },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (otherStaff) {
      throw new Error(
        `Login "${loginUserId}" is already linked to a different staff record.`
      );
    }

    const linkResult = await prisma.staff.updateMany({
      where: { id: staffId, userId: null },
      data: { userId: loginUserId },
    });
    linked = linkResult.count > 0;

    if (!linked) {
      const current = await prisma.staff.findUnique({
        where: { id: staffId },
        select: { userId: true },
      });
      if (current?.userId && current.userId !== loginUserId) {
        throw new Error(
          `Staff scope record for "${loginUserId}" is linked to a different login.`
        );
      }
    }
  }

  return { created, linked, userId: appUser.id };
}

export async function ensureHoustonAdminLogins(
  prisma: PrismaClient,
  schoolId: string,
  academicYearSchoolId: string,
  resolveClassroom: ClassroomResolver
): Promise<EnsureHoustonAdminLoginsResult> {
  for (const grade of SCHOOL_DEFAULT_TEACHER_GRADES) {
    await resolveClassroom(grade, "Boys");
    await resolveClassroom(grade, "Girls");
  }

  let created = 0;
  let linked = 0;
  let skipped = 0;
  const specs = buildHoustonAdminSpecs();

  for (const spec of specs) {
    const result = await ensureHoustonAdminLogin(
      prisma,
      schoolId,
      academicYearSchoolId,
      spec,
      resolveClassroom
    );
    if (result.created) {
      created++;
    } else if (result.linked) {
      linked++;
    } else {
      skipped++;
    }
  }

  return {
    processed: specs.length,
    created,
    linked,
    skipped,
  };
}

export const HOUSTON_ADMIN_LOGIN_COUNT = buildHoustonAdminSpecs().length;
