"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit/create-audit-log";
import {
  assertAcademicYearRecordAccess,
  assertAcademicYearSchoolAccess,
} from "@/lib/auth/academic-year-access";
import {
  academicYearSchema,
  academicYearListSchema,
  type AcademicYearInput,
} from "@/lib/validations/academic-year";
import { generateCalendarDaysForYear } from "@/lib/calendar/bootstrap-calendar-days";

function parseYearInput(data: AcademicYearInput) {
  const parsed = academicYearSchema.parse(data);
  return {
    schoolId: parsed.schoolId,
    name: parsed.name.trim(),
    startDate: new Date(parsed.startDate),
    endDate: new Date(parsed.endDate),
    isActive: parsed.isActive,
    generateCalendar: parsed.generateCalendar,
  };
}

async function setSingleActiveYear(schoolId: string, activeYearId: string) {
  await prisma.academicYear.updateMany({
    where: { schoolId, deletedAt: null, id: { not: activeYearId } },
    data: { isActive: false },
  });
}

export async function createAcademicYear(data: AcademicYearInput) {
  const user = await requirePermission("academic-years:create");
  const input = parseYearInput(data);
  await assertAcademicYearSchoolAccess(user, input.schoolId);

  const duplicate = await prisma.academicYear.findFirst({
    where: {
      schoolId: input.schoolId,
      name: input.name,
      deletedAt: null,
    },
  });
  if (duplicate) {
    throw new Error("An academic year with this name already exists for this school");
  }

  const year = await prisma.academicYear.create({
    data: {
      schoolId: input.schoolId,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      isActive: input.isActive,
    },
  });

  if (input.isActive) {
    await setSingleActiveYear(input.schoolId, year.id);
  }

  let calendarResult = { created: 0, skipped: 0 };
  if (input.generateCalendar) {
    calendarResult = await generateCalendarDaysForYear(
      year.id,
      input.startDate,
      input.endDate
    );
  }

  await createAuditLog({
    userId: user.id,
    schoolId: year.schoolId,
    entity: "AcademicYear",
    entityId: year.id,
    action: "CREATE",
    newValues: { ...year, calendarDaysCreated: calendarResult.created } as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/academic-years");
  revalidatePath("/calendar");
  return { year, calendarResult };
}

export async function updateAcademicYear(id: string, data: AcademicYearInput) {
  const user = await requirePermission("academic-years:update");
  const { schoolId } = await assertAcademicYearRecordAccess(user, id);
  await requirePermission("academic-years:update", { schoolId });

  const input = parseYearInput(data);
  if (input.schoolId !== schoolId) {
    throw new Error("Cannot move academic year to a different school");
  }

  const before = await prisma.academicYear.findUnique({ where: { id } });
  if (!before || before.deletedAt) throw new Error("Academic year not found");

  const duplicate = await prisma.academicYear.findFirst({
    where: {
      schoolId: input.schoolId,
      name: input.name,
      deletedAt: null,
      id: { not: id },
    },
  });
  if (duplicate) {
    throw new Error("An academic year with this name already exists for this school");
  }

  const year = await prisma.academicYear.update({
    where: { id },
    data: {
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      isActive: input.isActive,
    },
  });

  if (input.isActive) {
    await setSingleActiveYear(input.schoolId, year.id);
  }

  await createAuditLog({
    userId: user.id,
    schoolId: year.schoolId,
    entity: "AcademicYear",
    entityId: year.id,
    action: "UPDATE",
    oldValues: before as unknown as Prisma.InputJsonValue,
    newValues: year as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/academic-years");
  revalidatePath(`/academic-years/${id}`);
  revalidatePath("/calendar");
  return year;
}

export async function deleteAcademicYear(id: string) {
  const user = await requirePermission("academic-years:delete");
  const { schoolId } = await assertAcademicYearRecordAccess(user, id);
  await requirePermission("academic-years:delete", { schoolId });

  const before = await prisma.academicYear.findUnique({ where: { id } });
  if (!before || before.deletedAt) throw new Error("Academic year not found");

  const enrollmentCount = await prisma.studentEnrollment.count({
    where: { academicYearId: id, deletedAt: null },
  });
  if (enrollmentCount > 0) {
    throw new Error("Cannot delete an academic year with enrollments");
  }

  const year = await prisma.academicYear.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  await createAuditLog({
    userId: user.id,
    schoolId: year.schoolId,
    entity: "AcademicYear",
    entityId: year.id,
    action: "DELETE",
    oldValues: before as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/academic-years");
  revalidatePath("/calendar");
  return year;
}

export async function getAcademicYears(rawParams: {
  page?: number;
  pageSize?: number;
  search?: string;
  schoolId?: string;
}) {
  const user = await requirePermission("academic-years:read");
  const params = academicYearListSchema.parse(rawParams);
  const search = params.search?.trim();

  const where: Prisma.AcademicYearWhereInput = {
    deletedAt: null,
    ...(params.schoolId ? { schoolId: params.schoolId } : {}),
    ...(search
      ? { name: { contains: search, mode: "insensitive" } }
      : {}),
    ...(!user.roles.includes("SUPER_ADMIN")
      ? { schoolId: { in: user.schoolIds } }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.academicYear.findMany({
      where,
      orderBy: [{ startDate: "desc" }, { name: "asc" }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: {
        school: { select: { id: true, name: true } },
        _count: {
          select: {
            calendarDays: { where: { deletedAt: null } },
            enrollments: { where: { deletedAt: null } },
          },
        },
      },
    }),
    prisma.academicYear.count({ where }),
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

export async function getAcademicYearById(id: string) {
  const user = await requirePermission("academic-years:read");
  const { schoolId } = await assertAcademicYearRecordAccess(user, id);
  await requirePermission("academic-years:read", { schoolId });

  return prisma.academicYear.findFirst({
    where: { id, deletedAt: null },
    include: {
      school: true,
      _count: {
        select: {
          calendarDays: { where: { deletedAt: null } },
          enrollments: { where: { deletedAt: null } },
        },
      },
    },
  });
}

export async function getAcademicYearFormOptions() {
  const user = await requirePermission("academic-years:read");

  const schools = await prisma.school.findMany({
    where: user.roles.includes("SUPER_ADMIN")
      ? { deletedAt: null, isActive: true }
      : { id: { in: user.schoolIds }, deletedAt: null, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return { schools };
}

export async function activateAcademicYear(id: string) {
  const user = await requirePermission("academic-years:update");
  const { schoolId } = await assertAcademicYearRecordAccess(user, id);

  const year = await prisma.academicYear.update({
    where: { id },
    data: { isActive: true },
  });
  await setSingleActiveYear(schoolId, id);

  await createAuditLog({
    userId: user.id,
    schoolId,
    entity: "AcademicYear",
    entityId: id,
    action: "UPDATE",
    newValues: { isActive: true },
  });

  revalidatePath("/academic-years");
  return year;
}
