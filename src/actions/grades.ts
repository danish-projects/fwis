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
import { sectionNameForGender } from "@/lib/staff/gender-section";
import { getSelectedAcademicYear, resolveAcademicYearForSchool } from "@/lib/academic-year/resolve-year";
import { resolveListSchoolId } from "@/lib/school/resolve-school";
import {
  ensureClassroomForSchool,
} from "@/lib/classrooms/ensure-classroom-for-school";
import {
  gradeRecordSchema,
  bulkGradeRecordSchema,
  gradeRecordListSchema,
  type GradeRecordInput,
  type BulkGradeRecordInput,
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

  const name = await resolveGradeName(input.gradeId, input.sectionId, input.name);

  const ensured = await ensureClassroomForSchool(prisma, {
    schoolId: input.schoolId,
    gradeId: input.gradeId,
    sectionId: input.sectionId,
    name,
    isActive: input.isActive,
  });

  if (!ensured.createdLink) {
    throw new Error("This grade and section already exists for the selected school");
  }

  const record = await prisma.classroom.findFirstOrThrow({
    where: { id: ensured.classroomId },
  });

  await createAuditLog({
    userId: user.id,
    schoolId: input.schoolId,
    entity: "Classroom",
    entityId: record.id,
    action: "CREATE",
    newValues: {
      ...record,
      schoolId: input.schoolId,
      classroomSchoolId: ensured.classroomSchoolId,
    } as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/grades");
  return { ...record, schoolId: input.schoolId };
}

export async function createGradeRecordsBulk(data: BulkGradeRecordInput) {
  const user = await requirePermission("classrooms:create");
  const parsed = bulkGradeRecordSchema.parse(data);
  await assertGradeRecordSchoolAccess(user, parsed.schoolId);

  let allowedSectionId: number | null = null;
  if (isSectionScopedAdmin(user) && user.gender) {
    const expectedSection = sectionNameForGender(user.gender);
    const section = await prisma.section.findFirst({
      where: { name: expectedSection },
    });
    if (!section) {
      throw new Error(`Section "${expectedSection}" was not found. Run db:seed.`);
    }
    allowedSectionId = section.id;
    for (const pair of parsed.pairs) {
      if (pair.sectionId !== allowedSectionId) {
        throw new Error(
          user.gender === "MALE"
            ? "You can only create Boys grades"
            : "You can only create Girls grades"
        );
      }
    }
  }

  const created: Array<{ id: string; name: string; schoolId: string }> = [];
  const skipped: string[] = [];

  for (const pair of parsed.pairs) {
    const name = await resolveGradeName(pair.gradeId, pair.sectionId);
    const ensured = await ensureClassroomForSchool(prisma, {
      schoolId: parsed.schoolId,
      gradeId: pair.gradeId,
      sectionId: pair.sectionId,
      name,
      isActive: parsed.isActive,
    });

    if (!ensured.createdLink) {
      skipped.push(name);
      continue;
    }

    const record = await prisma.classroom.findFirstOrThrow({
      where: { id: ensured.classroomId },
    });

    await createAuditLog({
      userId: user.id,
      schoolId: parsed.schoolId,
      entity: "Classroom",
      entityId: record.id,
      action: "CREATE",
      newValues: {
        ...record,
        schoolId: parsed.schoolId,
        classroomSchoolId: ensured.classroomSchoolId,
      } as unknown as Prisma.InputJsonValue,
    });

    created.push({
      id: record.id,
      name: record.name,
      schoolId: parsed.schoolId,
    });
  }

  revalidatePath("/grades");
  return { created, skipped };
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

  const before = await prisma.classroom.findUnique({ where: { id } });
  if (!before || before.deletedAt) throw new Error("Grade not found");

  const name = await resolveGradeName(input.gradeId, input.sectionId, input.name);

  const ensured = await ensureClassroomForSchool(prisma, {
    schoolId: input.schoolId,
    gradeId: input.gradeId,
    sectionId: input.sectionId,
    name,
    isActive: input.isActive,
  });

  if (ensured.classroomId !== id && !ensured.createdLink) {
    throw new Error("This grade and section already exists for the selected school");
  }

  if (ensured.classroomId !== id) {
    await prisma.classroomSchool.updateMany({
      where: { classroomId: id, schoolId, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  const record = await prisma.classroom.update({
    where: { id: ensured.classroomId },
    data: {
      name,
      isActive: input.isActive,
    },
  });

  await prisma.classroomSchool.updateMany({
    where: { classroomId: ensured.classroomId, schoolId },
    data: { isActive: input.isActive, deletedAt: null },
  });

  await createAuditLog({
    userId: user.id,
    schoolId,
    entity: "Classroom",
    entityId: record.id,
    action: "UPDATE",
    oldValues: before as unknown as Prisma.InputJsonValue,
    newValues: {
      ...record,
      schoolId,
    } as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/grades");
  revalidatePath(`/grades/${id}`);
  if (ensured.classroomId !== id) {
    revalidatePath(`/grades/${ensured.classroomId}`);
  }
  return { ...record, schoolId };
}

export async function deleteGradeRecord(id: string) {
  const user = await requirePermission("classrooms:delete");
  const { schoolId } = await assertGradeRecordAccess(user, id);

  const before = await prisma.classroom.findUnique({ where: { id } });
  if (!before || before.deletedAt) throw new Error("Grade not found");

  const enrollmentCount = await prisma.studentEnrollment.count({
    where: {
      classroomId: id,
      schoolId,
      deletedAt: null,
      status: "ACTIVE",
    },
  });
  if (enrollmentCount > 0) {
    throw new Error("Cannot delete a grade with active enrollments");
  }

  const link = await prisma.classroomSchool.findFirst({
    where: { classroomId: id, schoolId, deletedAt: null },
  });
  if (!link) throw new Error("Grade not found for this school");

  await prisma.classroomSchool.update({
    where: { id: link.id },
    data: { deletedAt: new Date(), isActive: false },
  });

  await createAuditLog({
    userId: user.id,
    schoolId,
    entity: "Classroom",
    entityId: id,
    action: "DELETE",
    oldValues: {
      ...before,
      schoolId,
      classroomSchoolId: link.id,
    } as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/grades");
  return { ...before, schoolId, deletedAt: new Date(), isActive: false };
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
      listSchoolId
        ? { schoolId: listSchoolId }
        : { schoolId: "00000000-0000-0000-0000-000000000000" }
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

  const linkSchoolFilter = listSchoolId
    ? { schoolId: listSchoolId, deletedAt: null as Date | null }
    : user.roles.includes("NIGRA")
      ? { deletedAt: null as Date | null }
      : { schoolId: { in: user.schoolIds }, deletedAt: null as Date | null };

  const records = await prisma.classroom.findMany({
    where,
    orderBy: [{ grade: { sortOrder: "asc" } }, { name: "asc" }],
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
    include: {
      schoolLinks: {
        where: linkSchoolFilter,
        include: { school: { select: { id: true, name: true } } },
      },
      grade: true,
      section: true,
    },
  });

  const mapped = records.map((r) => {
    const link = r.schoolLinks[0];
    return {
      ...r,
      schoolId: link?.schoolId ?? listSchoolId ?? "",
      school: link?.school ?? { id: "", name: "" },
    };
  });

  const schoolIds = [
    ...new Set(mapped.map((r) => r.schoolId).filter(Boolean)),
  ];
  const yearBySchool = new Map<string, string>();
  for (const sid of schoolIds) {
    const year = await resolveAcademicYearForSchool(sid, selectedYear);
    if (year) yearBySchool.set(sid, year.id);
  }

  const yearIds = [...new Set(yearBySchool.values())];
  const assignments =
    yearIds.length > 0 && mapped.length > 0
      ? await prisma.staffAssignment.findMany({
          where: {
            classroomId: { in: mapped.map((r) => r.id) },
            academicYearSchoolId: { in: yearIds },
          },
          include: {
            staff: { select: { firstName: true, lastName: true } },
          },
        })
      : [];
  const staffByClassroom = new Map<string, typeof assignments>();
  for (const assignment of assignments) {
    if (!assignment.classroomId) continue;
    const list = staffByClassroom.get(assignment.classroomId) ?? [];
    list.push(assignment);
    staffByClassroom.set(assignment.classroomId, list);
  }

  const enrollmentCounts =
    yearIds.length > 0
      ? await prisma.studentEnrollment.groupBy({
          by: ["classroomId"],
          where: {
            classroomId: { in: mapped.map((r) => r.id) },
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

  const data = mapped.map((r) => ({
    ...r,
    staff: (staffByClassroom.get(r.id) ?? []).map((a) => ({ staff: a.staff })),
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
  const { schoolId } = await assertGradeRecordAccess(user, id);

  const selectedYear = await getSelectedAcademicYear(user);
  const schoolYear = await resolveAcademicYearForSchool(schoolId, selectedYear);

  const record = await prisma.classroom.findFirst({
    where: { id, deletedAt: null },
    include: {
      schoolLinks: {
        where: { schoolId, deletedAt: null },
        include: { school: true },
      },
      grade: true,
      section: true,
      assignments: {
        where: schoolYear
          ? { academicYearSchoolId: schoolYear.id }
          : { id: "00000000-0000-0000-0000-000000000000" },
        include: {
          staff: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
    },
  });
  if (!record) return null;

  const school = record.schoolLinks[0]?.school ?? null;

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

  return {
    ...record,
    schoolId,
    school,
    staff: record.assignments.map((a) => ({ staff: a.staff })),
    enrollmentCount,
  };
}

export async function getGradeRecordFormOptions(schoolId?: string) {
  const user = await requirePermission("classrooms:read");
  const listSchoolId = await resolveListSchoolId(user, schoolId);

  const [schools, grades, sections] = await Promise.all([
    prisma.school.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        ...(user.roles.includes("NIGRA")
          ? {}
          : { id: { in: user.schoolIds } }),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.grade.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.section.findMany({ orderBy: { name: "asc" } }),
  ]);

  const defaultSchoolId = listSchoolId ?? schools[0]?.id ?? null;
  const existingSchoolId = schoolId ?? defaultSchoolId;

  let existingPairs: Array<{ gradeId: number; sectionId: number }> = [];
  if (existingSchoolId) {
    const links = await prisma.classroomSchool.findMany({
      where: {
        schoolId: existingSchoolId,
        deletedAt: null,
        isActive: true,
        classroom: { deletedAt: null },
      },
      select: {
        classroom: { select: { gradeId: true, sectionId: true } },
      },
    });
    existingPairs = links.map((link) => ({
      gradeId: link.classroom.gradeId,
      sectionId: link.classroom.sectionId,
    }));
  }

  const allowedSectionName =
    isSectionScopedAdmin(user) && user.gender
      ? sectionNameForGender(user.gender)
      : null;
  const visibleSections = allowedSectionName
    ? sections.filter((section) => section.name === allowedSectionName)
    : sections;

  return {
    schools,
    grades,
    sections: visibleSections,
    defaultSchoolId,
    existingPairs,
  };
}
