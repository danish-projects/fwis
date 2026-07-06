"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit/create-audit-log";
import {
  assertGradeRecordAccess,
  assertGradeRecordSchoolAccess,
} from "@/lib/auth/grade-record-access";
import {
  buildClassroomListWhere,
  isSectionScopedAdmin,
} from "@/lib/auth/section-scope";
import { sectionNameForGender } from "@/lib/teachers/gender-section";
import { getSelectedAcademicYear, resolveAcademicYearForSchool } from "@/lib/academic-year/resolve-year";
import { resolveListSchoolId } from "@/lib/school/resolve-school";
import {
  gradeRecordSchema,
  gradeRecordListSchema,
  type GradeRecordInput,
} from "@/lib/validations/grade-record";

async function resolveGradeName(
  gradeId: number,
  sectionId: number,
  name?: string
) {
  if (name?.trim()) return name.trim();

  const [grade, section] = await Promise.all([
    prisma.grade.findUnique({ where: { id: gradeId } }),
    prisma.section.findUnique({ where: { id: sectionId } }),
  ]);
  if (!grade || !section) throw new Error("Invalid grade level or section");
  return `${grade.name} ${section.name}`;
}

function parseGradeInput(data: GradeRecordInput) {
  const parsed = gradeRecordSchema.parse(data);
  return {
    schoolId: parsed.schoolId,
    gradeId: parsed.gradeId,
    sectionId: parsed.sectionId,
    name: parsed.name?.trim(),
    isActive: parsed.isActive,
  };
}

export async function createGradeRecord(data: GradeRecordInput) {
  const user = await requirePermission("classrooms:create");
  const input = parseGradeInput(data);
  await assertGradeRecordSchoolAccess(user, input.schoolId);

  if (isSectionScopedAdmin(user) && user.gender) {
    const section = await prisma.section.findUnique({
      where: { id: input.sectionId },
    });
    const expectedSection = sectionNameForGender(user.gender);
    if (!section || section.name !== expectedSection) {
      throw new Error(
        user.gender === "MALE"
          ? "You can only create Boys grades"
          : "You can only create Girls grades"
      );
    }
  }

  const existing = await prisma.classroom.findFirst({
    where: {
      schoolId: input.schoolId,
      gradeId: input.gradeId,
      sectionId: input.sectionId,
      deletedAt: null,
    },
  });
  if (existing) {
    throw new Error("This grade and section already exists for the selected school");
  }

  const name = await resolveGradeName(input.gradeId, input.sectionId, input.name);

  const record = await prisma.classroom.create({
    data: {
      schoolId: input.schoolId,
      gradeId: input.gradeId,
      sectionId: input.sectionId,
      name,
      isActive: input.isActive,
    },
  });

  await createAuditLog({
    userId: user.id,
    schoolId: record.schoolId,
    entity: "Classroom",
    entityId: record.id,
    action: "CREATE",
    newValues: record as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/grades");
  return record;
}

export async function updateGradeRecord(id: string, data: GradeRecordInput) {
  const user = await requirePermission("classrooms:update");
  const { schoolId } = await assertGradeRecordAccess(user, id);
  const input = parseGradeInput(data);

  if (input.schoolId !== schoolId) {
    throw new Error("Cannot move a grade to a different school");
  }

  if (isSectionScopedAdmin(user) && user.gender) {
    const section = await prisma.section.findUnique({
      where: { id: input.sectionId },
    });
    const expectedSection = sectionNameForGender(user.gender);
    if (!section || section.name !== expectedSection) {
      throw new Error(
        user.gender === "MALE"
          ? "You can only manage Boys grades"
          : "You can only manage Girls grades"
      );
    }
  }

  const duplicate = await prisma.classroom.findFirst({
    where: {
      schoolId: input.schoolId,
      gradeId: input.gradeId,
      sectionId: input.sectionId,
      deletedAt: null,
      id: { not: id },
    },
  });
  if (duplicate) {
    throw new Error("This grade and section already exists for the selected school");
  }

  const before = await prisma.classroom.findUnique({ where: { id } });
  if (!before || before.deletedAt) throw new Error("Grade not found");

  const name = await resolveGradeName(input.gradeId, input.sectionId, input.name);

  const record = await prisma.classroom.update({
    where: { id },
    data: {
      gradeId: input.gradeId,
      sectionId: input.sectionId,
      name,
      isActive: input.isActive,
    },
  });

  await createAuditLog({
    userId: user.id,
    schoolId: record.schoolId,
    entity: "Classroom",
    entityId: record.id,
    action: "UPDATE",
    oldValues: before as unknown as Prisma.InputJsonValue,
    newValues: record as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/grades");
  revalidatePath(`/grades/${id}`);
  return record;
}

export async function deleteGradeRecord(id: string) {
  const user = await requirePermission("classrooms:delete");
  await assertGradeRecordAccess(user, id);

  const before = await prisma.classroom.findUnique({ where: { id } });
  if (!before || before.deletedAt) throw new Error("Grade not found");

  const enrollmentCount = await prisma.studentEnrollment.count({
    where: { classroomId: id, deletedAt: null, status: "ACTIVE" },
  });
  if (enrollmentCount > 0) {
    throw new Error("Cannot delete a grade with active enrollments");
  }

  const record = await prisma.classroom.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  await createAuditLog({
    userId: user.id,
    schoolId: record.schoolId,
    entity: "Classroom",
    entityId: record.id,
    action: "DELETE",
    oldValues: before as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/grades");
  return record;
}

export async function getGradeRecords(rawParams: {
  page?: number;
  pageSize?: number;
  search?: string;
  schoolId?: string;
}) {
  const user = await requirePermission("classrooms:read");
  const params = gradeRecordListSchema.parse(rawParams);
  const search = params.search?.trim();
  const selectedYear = await getSelectedAcademicYear(user);
  const listSchoolId = await resolveListSchoolId(user, params.schoolId);

  const where: Prisma.ClassroomWhereInput = {
    ...buildClassroomListWhere(
      user,
      listSchoolId ? { schoolId: listSchoolId } : { schoolId: "00000000-0000-0000-0000-000000000000" }
    ),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { grade: { name: { contains: search, mode: "insensitive" } } },
            { section: { name: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const records = await prisma.classroom.findMany({
    where,
    orderBy: [{ school: { name: "asc" } }, { grade: { sortOrder: "asc" } }, { name: "asc" }],
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
    include: {
      school: { select: { id: true, name: true } },
      grade: true,
      section: true,
      teachers: { include: { teacher: { select: { firstName: true, lastName: true } } } },
    },
  });

  const schoolIds = [...new Set(records.map((r) => r.schoolId))];
  const yearBySchool = new Map<string, string>();
  for (const sid of schoolIds) {
    const year = await resolveAcademicYearForSchool(sid, selectedYear);
    if (year) yearBySchool.set(sid, year.id);
  }

  const yearIds = [...new Set(yearBySchool.values())];
  const enrollmentCounts =
    yearIds.length > 0
      ? await prisma.studentEnrollment.groupBy({
          by: ["classroomId"],
          where: {
            classroomId: { in: records.map((r) => r.id) },
            academicYearSchoolId: { in: yearIds },
            deletedAt: null,
            status: "ACTIVE",
          },
          _count: { _all: true },
        })
      : [];
  const countMap = new Map(
    enrollmentCounts.map((c) => [c.classroomId, c._count._all])
  );

  const data = records.map((r) => ({
    ...r,
    _count: { enrollments: countMap.get(r.id) ?? 0 },
  }));

  const total = await prisma.classroom.count({ where });

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

export async function getGradeRecordById(id: string) {
  const user = await requirePermission("classrooms:read");
  await assertGradeRecordAccess(user, id);

  const selectedYear = await getSelectedAcademicYear(user);
  const record = await prisma.classroom.findFirst({
    where: { id, deletedAt: null },
    include: {
      school: true,
      grade: true,
      section: true,
      teachers: {
        include: {
          teacher: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
    },
  });
  if (!record) return null;

  const schoolYear = await resolveAcademicYearForSchool(record.schoolId, selectedYear);
  const enrollmentCount = schoolYear
    ? await prisma.studentEnrollment.count({
        where: {
          classroomId: id,
          academicYearSchoolId: schoolYear.id,
          deletedAt: null,
          status: "ACTIVE",
        },
      })
    : 0;

  return { ...record, enrollmentCount };
}

export async function getGradeRecordFormOptions(schoolId?: string) {
  const user = await requirePermission("classrooms:read");
  const listSchoolId = await resolveListSchoolId(user, schoolId);

  const [schools, grades, sections] = await Promise.all([
    prisma.school.findMany({
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
    }),
    prisma.grade.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.section.findMany({ orderBy: { name: "asc" } }),
  ]);

  const defaultSchoolId = listSchoolId ?? schools[0]?.id ?? null;

  return { schools, grades, sections, defaultSchoolId };
}
