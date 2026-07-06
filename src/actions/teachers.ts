"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit/create-audit-log";
import {
  assertTeacherRecordAccess,
  assertTeacherSchoolAccess,
} from "@/lib/auth/teacher-access";
import { teacherSchema, teacherListSchema, type TeacherInput } from "@/lib/validations/teacher";
import { sectionNameForGender } from "@/lib/teachers/gender-section";
import type { GenderCode } from "@/lib/setup-types";
import {
  buildClassroomListWhere,
  buildTeacherScopeWhere,
  isSectionScopedAdmin,
} from "@/lib/auth/section-scope";
import { resolveListSchoolId } from "@/lib/school/resolve-school";

function parseTeacherInput(data: TeacherInput) {
  const parsed = teacherSchema.parse(data);
  return {
    schoolId: parsed.schoolId,
    gender: parsed.gender,
    firstName: parsed.firstName.trim(),
    lastName: parsed.lastName.trim(),
    email: parsed.email.trim().toLowerCase(),
    phone: parsed.phone?.trim() || null,
    isActive: parsed.isActive,
    classroomIds: parsed.classroomIds,
  };
}

async function syncTeacherClassrooms(teacherId: string, classroomIds: string[]) {
  if (classroomIds.length > 1) {
    throw new Error("A teacher may only be assigned to one grade");
  }

  await prisma.teacherClassroom.deleteMany({ where: { teacherId } });
  if (classroomIds.length === 0) return;

  const classroomId = classroomIds[0];
  const taken = await prisma.teacherClassroom.findFirst({
    where: { classroomId, teacherId: { not: teacherId } },
  });
  if (taken) {
    throw new Error("This grade is already assigned to another teacher");
  }

  await prisma.teacherClassroom.create({
    data: { teacherId, classroomId },
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
      schoolId,
      deletedAt: null,
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
        ? "Male teachers can only be assigned to Boys grades"
        : "Female teachers can only be assigned to Girls grades"
    );
  }
}

export async function createTeacher(data: TeacherInput) {
  const user = await requirePermission("teachers:create");
  const input = parseTeacherInput(data);
  await assertTeacherSchoolAccess(user, input.schoolId);
  await validateClassroomsForSchool(input.schoolId, input.classroomIds, input.gender);

  const duplicate = await prisma.teacher.findFirst({
    where: {
      schoolId: input.schoolId,
      email: input.email,
      deletedAt: null,
    },
  });
  if (duplicate) {
    throw new Error("A teacher with this email already exists at this school");
  }

  const teacher = await prisma.teacher.create({
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

  await syncTeacherClassrooms(teacher.id, input.classroomIds);

  await createAuditLog({
    userId: user.id,
    schoolId: teacher.schoolId,
    entity: "Teacher",
    entityId: teacher.id,
    action: "CREATE",
    newValues: {
      ...teacher,
      classroomIds: input.classroomIds,
    } as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/teachers");
  return teacher;
}

export async function updateTeacher(id: string, data: TeacherInput) {
  const user = await requirePermission("teachers:update");
  const { schoolId } = await assertTeacherRecordAccess(user, id);
  const input = parseTeacherInput(data);

  if (input.schoolId !== schoolId) {
    throw new Error("Cannot move teacher to a different school");
  }

  await validateClassroomsForSchool(input.schoolId, input.classroomIds, input.gender);

  const before = await prisma.teacher.findUnique({
    where: { id },
    include: { classrooms: true },
  });
  if (!before || before.deletedAt) throw new Error("Teacher not found");

  const duplicate = await prisma.teacher.findFirst({
    where: {
      schoolId: input.schoolId,
      email: input.email,
      deletedAt: null,
      id: { not: id },
    },
  });
  if (duplicate) {
    throw new Error("A teacher with this email already exists at this school");
  }

  const teacher = await prisma.teacher.update({
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

  await syncTeacherClassrooms(id, input.classroomIds);

  await createAuditLog({
    userId: user.id,
    schoolId: teacher.schoolId,
    entity: "Teacher",
    entityId: teacher.id,
    action: "UPDATE",
    oldValues: before as unknown as Prisma.InputJsonValue,
    newValues: {
      ...teacher,
      classroomIds: input.classroomIds,
    } as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/teachers");
  revalidatePath(`/teachers/${id}`);
  return teacher;
}

export async function deleteTeacher(id: string) {
  const user = await requirePermission("teachers:delete");
  await assertTeacherRecordAccess(user, id);

  const before = await prisma.teacher.findUnique({ where: { id } });
  if (!before || before.deletedAt) throw new Error("Teacher not found");

  const enrollmentCount = await prisma.studentEnrollment.count({
    where: { teacherId: id, deletedAt: null, status: "ACTIVE" },
  });
  if (enrollmentCount > 0) {
    throw new Error("Cannot delete a teacher assigned to active enrollments");
  }

  const teacher = await prisma.teacher.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  await prisma.teacherClassroom.deleteMany({ where: { teacherId: id } });

  await createAuditLog({
    userId: user.id,
    schoolId: teacher.schoolId,
    entity: "Teacher",
    entityId: teacher.id,
    action: "DELETE",
    oldValues: before as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/teachers");
  return teacher;
}

export async function getTeachers(rawParams: {
  page?: number;
  pageSize?: number;
  search?: string;
  schoolId?: string;
  gender?: GenderCode;
  isActive?: boolean;
}) {
  const user = await requirePermission("teachers:read");
  const params = teacherListSchema.parse(rawParams);
  const search = params.search?.trim();
  const listSchoolId = await resolveListSchoolId(user, params.schoolId);

  const where: Prisma.TeacherWhereInput = {
    ...buildTeacherScopeWhere(user),
    schoolId: listSchoolId ?? "00000000-0000-0000-0000-000000000000",
    ...(params.gender && !isSectionScopedAdmin(user) ? { gender: params.gender } : {}),
    ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
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
    prisma.teacher.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: {
        school: { select: { id: true, name: true } },
        genderRef: { select: { code: true, label: true } },
        classrooms: {
          include: {
            classroom: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: {
            enrollments: {
              where: { deletedAt: null, status: "ACTIVE" },
            },
          },
        },
      },
    }),
    prisma.teacher.count({ where }),
  ]);

  return {
    data,
    meta: {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages: Math.ceil(total / params.pageSize),
    },
  };
}

export async function getTeacherById(id: string) {
  const user = await requirePermission("teachers:read");
  await assertTeacherRecordAccess(user, id);

  return prisma.teacher.findFirst({
    where: { id, deletedAt: null },
    include: {
      school: true,
      genderRef: true,
      user: { select: { id: true, email: true, fullName: true } },
      classrooms: {
        include: {
          classroom: {
            include: { grade: true, section: true },
          },
        },
      },
      _count: {
        select: {
          enrollments: {
            where: { deletedAt: null, status: "ACTIVE" },
          },
        },
      },
    },
  });
}

export async function getTeacherFormOptions(schoolId?: string) {
  const user = await requirePermission("teachers:read");
  const listSchoolId = await resolveListSchoolId(user, schoolId);

  const schools = await prisma.school.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      ...(user.roles.includes("SUPER_ADMIN")
        ? listSchoolId
          ? { id: listSchoolId }
          : { id: "00000000-0000-0000-0000-000000000000" }
        : { id: { in: user.schoolIds } }),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const resolvedSchoolId = listSchoolId ?? schools[0]?.id ?? null;

  const classrooms = await prisma.classroom.findMany({
    where: buildClassroomListWhere(user, {
      ...(resolvedSchoolId ? { schoolId: resolvedSchoolId } : {}),
    }),
    orderBy: [{ school: { name: "asc" } }, { name: "asc" }],
    include: { grade: true, section: true, school: { select: { id: true, name: true } } },
  });

  return {
    schools,
    classrooms: classrooms.map((c) => ({
      id: c.id,
      name: c.name,
      schoolId: c.schoolId,
      sectionName: c.section.name,
      gradeName: c.grade.name,
    })),
    defaultSchoolId: resolvedSchoolId ?? null,
  };
}
