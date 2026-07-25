"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit/create-audit-log";
import {
  assertStaffRecordAccess,
  assertStaffSchoolAccess,
} from "@/lib/auth/staff-access";
import { staffSchema, staffListSchema, type StaffInput } from "@/lib/validations/staff";
import { sectionNameForGender } from "@/lib/staff/gender-section";
import type { GenderCode } from "@/lib/setup-types";
import { STAFF_POSITION_CODES } from "@/lib/roles/staff-positions";
import {
  buildClassroomListWhere,
  buildStaffScopeWhere,
  isSectionScopedAdmin,
} from "@/lib/auth/section-scope";
import { resolveListSchoolId } from "@/lib/school/resolve-school";
import {
  getSelectedAcademicYear,
  resolveAcademicYearSchoolForSchool,
} from "@/lib/academic-year/resolve-year";

function parseStaffInput(data: StaffInput) {
  const parsed = staffSchema.parse(data);
  return {
    schoolId: parsed.schoolId,
    gender: parsed.gender,
    roleId: parsed.roleId,
    firstName: parsed.firstName.trim(),
    lastName: parsed.lastName.trim(),
    email: parsed.email.trim().toLowerCase(),
    phone: parsed.phone?.trim() || null,
    isActive: parsed.isActive,
    classroomIds: parsed.classroomIds,
  };
}

async function assertStaffRoleId(roleId: number) {
  const role = await prisma.role.findFirst({
    where: {
      id: roleId,
      code: { in: [...STAFF_POSITION_CODES] },
    },
  });
  if (!role) {
    throw new Error("Invalid staff role");
  }
  return role;
}

async function resolveAssignmentYearSchool(user: Awaited<ReturnType<typeof requirePermission>>, schoolId: string) {
  const selectedYear = await getSelectedAcademicYear(user);
  const yearSchool = await resolveAcademicYearSchoolForSchool(schoolId, selectedYear);
  if (!yearSchool) {
    throw new Error(
      "No academic year is linked to this school. Create or select an academic year first."
    );
  }
  return yearSchool;
}

async function upsertStaffAssignment(options: {
  staffId: string;
  academicYearSchoolId: string;
  roleId: number;
  classroomId: string | null;
}) {
  if (options.classroomId) {
    const taken = await prisma.staffAssignment.findFirst({
      where: {
        academicYearSchoolId: options.academicYearSchoolId,
        classroomId: options.classroomId,
        staffId: { not: options.staffId },
      },
    });
    if (taken) {
      throw new Error(
        "This grade is already assigned to another staff member for this academic year"
      );
    }
  }

  await prisma.staffAssignment.upsert({
    where: {
      staffId_academicYearSchoolId: {
        staffId: options.staffId,
        academicYearSchoolId: options.academicYearSchoolId,
      },
    },
    update: {
      roleId: options.roleId,
      classroomId: options.classroomId,
    },
    create: {
      staffId: options.staffId,
      academicYearSchoolId: options.academicYearSchoolId,
      roleId: options.roleId,
      classroomId: options.classroomId,
    },
  });
}

async function validateClassroomsForSchool(
  schoolId: string,
  classroomIds: string[],
  gender: GenderCode
) {
  if (classroomIds.length === 0) return;

  const classrooms = await prisma.classroom.findMany({
    where: {
      id: { in: classroomIds },
      deletedAt: null,
      schoolLinks: {
        some: { schoolId, deletedAt: null, isActive: true },
      },
    },
    include: { section: true },
  });

  if (classrooms.length !== classroomIds.length) {
    throw new Error("One or more grades do not belong to the selected school");
  }

  const expectedSection = sectionNameForGender(gender);
  const invalid = classrooms.find((c) => c.section.name !== expectedSection);
  if (invalid) {
    throw new Error(
      gender === "MALE"
        ? "Male staff can only be assigned to Boys grades"
        : "Female staff can only be assigned to Girls grades"
    );
  }
}

export async function createStaff(data: StaffInput) {
  const user = await requirePermission("staff:create");
  const input = parseStaffInput(data);
  await assertStaffSchoolAccess(user, input.schoolId);
  await assertStaffRoleId(input.roleId);
  await validateClassroomsForSchool(input.schoolId, input.classroomIds, input.gender);
  const yearSchool = await resolveAssignmentYearSchool(user, input.schoolId);

  const duplicate = await prisma.staff.findFirst({
    where: {
      schoolId: input.schoolId,
      email: input.email,
      deletedAt: null,
    },
  });
  if (duplicate) {
    throw new Error("A staff member with this email already exists at this school");
  }

  const staff = await prisma.staff.create({
    data: {
      schoolId: input.schoolId,
      gender: input.gender,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      isActive: input.isActive,
    },
  });

  await upsertStaffAssignment({
    staffId: staff.id,
    academicYearSchoolId: yearSchool.id,
    roleId: input.roleId,
    classroomId: input.classroomIds[0] ?? null,
  });

  await createAuditLog({
    userId: user.id,
    schoolId: staff.schoolId,
    entity: "Staff",
    entityId: staff.id,
    action: "CREATE",
    newValues: {
      ...staff,
      roleId: input.roleId,
      classroomIds: input.classroomIds,
      academicYearSchoolId: yearSchool.id,
    } as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/staff");
  return staff;
}

export async function updateStaff(id: string, data: StaffInput) {
  const user = await requirePermission("staff:update");
  const { schoolId } = await assertStaffRecordAccess(user, id);
  const input = parseStaffInput(data);

  if (input.schoolId !== schoolId) {
    throw new Error("Cannot move staff member to a different school");
  }

  await assertStaffRoleId(input.roleId);
  await validateClassroomsForSchool(input.schoolId, input.classroomIds, input.gender);
  const yearSchool = await resolveAssignmentYearSchool(user, input.schoolId);

  const before = await prisma.staff.findUnique({
    where: { id },
    include: {
      assignments: {
        where: { academicYearSchoolId: yearSchool.id },
        include: { role: true, classroom: true },
      },
    },
  });
  if (!before || before.deletedAt) throw new Error("Staff member not found");

  const duplicate = await prisma.staff.findFirst({
    where: {
      schoolId: input.schoolId,
      email: input.email,
      deletedAt: null,
      id: { not: id },
    },
  });
  if (duplicate) {
    throw new Error("A staff member with this email already exists at this school");
  }

  const staff = await prisma.staff.update({
    where: { id },
    data: {
      gender: input.gender,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      isActive: input.isActive,
    },
  });

  await upsertStaffAssignment({
    staffId: id,
    academicYearSchoolId: yearSchool.id,
    roleId: input.roleId,
    classroomId: input.classroomIds[0] ?? null,
  });

  await createAuditLog({
    userId: user.id,
    schoolId: staff.schoolId,
    entity: "Staff",
    entityId: staff.id,
    action: "UPDATE",
    oldValues: before as unknown as Prisma.InputJsonValue,
    newValues: {
      ...staff,
      roleId: input.roleId,
      classroomIds: input.classroomIds,
      academicYearSchoolId: yearSchool.id,
    } as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/staff");
  revalidatePath(`/staff/${id}`);
  return staff;
}

export async function deleteStaff(id: string) {
  const user = await requirePermission("staff:delete");
  await assertStaffRecordAccess(user, id);

  const before = await prisma.staff.findUnique({ where: { id } });
  if (!before || before.deletedAt) throw new Error("Staff member not found");

  const enrollmentCount = await prisma.studentEnrollment.count({
    where: { staffId: id, deletedAt: null, status: "ACTIVE" },
  });
  if (enrollmentCount > 0) {
    throw new Error("Cannot delete a staff member assigned to active enrollments");
  }

  const staff = await prisma.staff.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  await prisma.staffAssignment.deleteMany({ where: { staffId: id } });

  await createAuditLog({
    userId: user.id,
    schoolId: staff.schoolId,
    entity: "Staff",
    entityId: staff.id,
    action: "DELETE",
    oldValues: before as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/staff");
  return staff;
}

export async function getStaffMembers(rawParams: {
  page?: number;
  pageSize?: number;
  search?: string;
  schoolId?: string;
  gender?: GenderCode;
  roleId?: number;
  isActive?: boolean;
}) {
  const user = await requirePermission("staff:read");
  const params = staffListSchema.parse(rawParams);
  const search = params.search?.trim();
  const listSchoolId = await resolveListSchoolId(user, params.schoolId);
  const selectedYear = await getSelectedAcademicYear(user);

  const yearSchool =
    listSchoolId != null
      ? await resolveAcademicYearSchoolForSchool(listSchoolId, selectedYear)
      : null;

  const where: Prisma.StaffWhereInput = {
    ...buildStaffScopeWhere(user),
    schoolId: listSchoolId ?? "00000000-0000-0000-0000-000000000000",
    ...(params.gender && !isSectionScopedAdmin(user) ? { gender: params.gender } : {}),
    ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
    ...(params.roleId && yearSchool
      ? {
          assignments: {
            some: {
              academicYearSchoolId: yearSchool.id,
              roleId: params.roleId,
            },
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.staff.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: {
        school: { select: { id: true, name: true } },
        genderRef: { select: { code: true, label: true } },
        assignments: {
          where: yearSchool ? { academicYearSchoolId: yearSchool.id } : { id: "00000000-0000-0000-0000-000000000000" },
          include: {
            role: { select: { id: true, code: true, name: true } },
            classroom: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: {
            enrollments: {
              where: {
                deletedAt: null,
                status: "ACTIVE",
                ...(yearSchool ? { academicYearSchoolId: yearSchool.id } : {}),
              },
            },
          },
        },
      },
    }),
    prisma.staff.count({ where }),
  ]);

  return {
    data: data.map((staff) => {
      const assignment = staff.assignments[0] ?? null;
      return {
        ...staff,
        role: assignment?.role ?? null,
        classrooms: assignment?.classroom
          ? [{ classroom: assignment.classroom }]
          : [],
        academicYearName: yearSchool?.academicYear.name ?? null,
      };
    }),
    meta: {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages: Math.ceil(total / params.pageSize),
    },
  };
}

export async function getStaffById(id: string) {
  const user = await requirePermission("staff:read");
  await assertStaffRecordAccess(user, id);

  const staff = await prisma.staff.findFirst({
    where: { id, deletedAt: null },
    include: {
      school: true,
      genderRef: true,
      user: { select: { id: true, userId: true, fullName: true } },
      _count: {
        select: {
          enrollments: {
            where: { deletedAt: null, status: "ACTIVE" },
          },
        },
      },
    },
  });
  if (!staff) return null;

  const selectedYear = await getSelectedAcademicYear(user);
  const yearSchool = await resolveAcademicYearSchoolForSchool(
    staff.schoolId,
    selectedYear
  );

  const assignment = yearSchool
    ? await prisma.staffAssignment.findUnique({
        where: {
          staffId_academicYearSchoolId: {
            staffId: staff.id,
            academicYearSchoolId: yearSchool.id,
          },
        },
        include: {
          role: true,
          classroom: {
            include: { grade: true, section: true },
          },
        },
      })
    : null;

  return {
    ...staff,
    roleId: assignment?.roleId ?? null,
    role: assignment?.role ?? null,
    classrooms: assignment?.classroom
      ? [{ classroom: assignment.classroom }]
      : [],
    academicYearSchoolId: yearSchool?.id ?? null,
    academicYearName: yearSchool?.academicYear.name ?? null,
  };
}

export async function getStaffFormOptions(schoolId?: string) {
  const user = await requirePermission("staff:read");
  const listSchoolId = await resolveListSchoolId(user, schoolId);
  const selectedYear = await getSelectedAcademicYear(user);

  const [schools, roles] = await Promise.all([
    prisma.school.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        ...(user.roles.includes("NIGRA")
          ? listSchoolId
            ? { id: listSchoolId }
            : { id: "00000000-0000-0000-0000-000000000000" }
          : { id: { in: user.schoolIds } }),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.role.findMany({
      where: { code: { in: [...STAFF_POSITION_CODES] } },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    }),
  ]);

  const resolvedSchoolId = listSchoolId ?? schools[0]?.id ?? null;
  const yearSchool =
    resolvedSchoolId != null
      ? await resolveAcademicYearSchoolForSchool(resolvedSchoolId, selectedYear)
      : null;

  const classrooms = await prisma.classroom.findMany({
    where: buildClassroomListWhere(user, {
      ...(resolvedSchoolId ? { schoolId: resolvedSchoolId } : {}),
    }),
    orderBy: [{ name: "asc" }],
    include: {
      grade: true,
      section: true,
      schoolLinks: {
        where: resolvedSchoolId
          ? { schoolId: resolvedSchoolId, deletedAt: null }
          : { deletedAt: null },
        select: { schoolId: true },
      },
    },
  });

  return {
    schools,
    roles,
    classrooms: classrooms.map((c) => ({
      id: c.id,
      name: c.name,
      schoolId: c.schoolLinks[0]?.schoolId ?? resolvedSchoolId ?? "",
      sectionName: c.section.name,
      gradeName: c.grade.name,
    })),
    defaultSchoolId: resolvedSchoolId ?? null,
    academicYearName: yearSchool?.academicYear.name ?? null,
    academicYearSchoolId: yearSchool?.id ?? null,
  };
}
