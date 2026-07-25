"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission, type AuthUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit/create-audit-log";
import {
  assertAcademicYearRecordAccess,
  assertAcademicYearSchoolAccess,
} from "@/lib/auth/academic-year-access";
import {
  academicYearCreateSchema,
  academicYearUpdateSchema,
  academicYearListSchema,
  type AcademicYearCreateInput,
  type AcademicYearInput,
} from "@/lib/validations/academic-year";
import { generateCalendarDaysForYear } from "@/lib/calendar/bootstrap-calendar-days";
import { getSelectedSchool } from "@/lib/school/resolve-school";

function parseCreateInput(data: AcademicYearCreateInput) {
  const parsed = academicYearCreateSchema.parse(data);
  return {
    schoolIds: [...new Set(parsed.schoolIds)],
    name: parsed.name.trim(),
    startDate: new Date(parsed.startDate),
    endDate: new Date(parsed.endDate),
    isActive: parsed.isActive,
    generateCalendar: parsed.generateCalendar,
  };
}

function parseUpdateInput(data: AcademicYearInput) {
  const parsed = academicYearUpdateSchema.parse(data);
  return {
    schoolIds: [...new Set(parsed.schoolIds)],
    name: parsed.name.trim(),
    startDate: new Date(parsed.startDate),
    endDate: new Date(parsed.endDate),
    isActive: parsed.isActive,
    generateCalendar: parsed.generateCalendar,
  };
}

async function setSingleActiveYearSchool(schoolId: string, activeLinkId: string) {
  await prisma.academicYearSchool.updateMany({
    where: { schoolId, deletedAt: null, id: { not: activeLinkId } },
    data: { isActive: false },
  });
}

async function syncSchoolLinks(
  academicYearId: string,
  schoolIds: string[],
  user: AuthUser,
  options: {
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    generateCalendar: boolean;
  }
) {
  for (const schoolId of schoolIds) {
    await assertAcademicYearSchoolAccess(user, schoolId);
  }

  const existing = await prisma.academicYearSchool.findMany({
    where: { academicYearId },
    include: { school: { select: { name: true } } },
  });

  const toRemove = existing.filter(
    (link) => !link.deletedAt && !schoolIds.includes(link.schoolId)
  );

  for (const link of toRemove) {
    const enrollmentCount = await prisma.studentEnrollment.count({
      where: { academicYearSchoolId: link.id, deletedAt: null },
    });
    if (enrollmentCount > 0) {
      throw new Error(
        `Cannot remove ${link.school.name} — it has enrollments for this year`
      );
    }
    await prisma.academicYearSchool.update({
      where: { id: link.id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  const createdLinks: string[] = [];

  for (const schoolId of schoolIds) {
    const prior = existing.find((link) => link.schoolId === schoolId);
    let linkId: string;

    if (prior?.deletedAt) {
      const restored = await prisma.academicYearSchool.update({
        where: { id: prior.id },
        data: { deletedAt: null, isActive: options.isActive },
      });
      linkId = restored.id;
    } else if (prior) {
      linkId = prior.id;
      await prisma.academicYearSchool.update({
        where: { id: prior.id },
        data: { isActive: options.isActive },
      });
    } else {
      const created = await prisma.academicYearSchool.create({
        data: {
          schoolId,
          academicYearId,
          isActive: options.isActive,
        },
      });
      linkId = created.id;
      createdLinks.push(linkId);

      if (options.generateCalendar) {
        await generateCalendarDaysForYear(linkId, options.startDate, options.endDate);
      }
    }

    if (options.isActive) {
      await setSingleActiveYearSchool(schoolId, linkId);
    }
  }

  return createdLinks;
}

export async function createAcademicYear(data: AcademicYearCreateInput) {
  const user = await requirePermission("academic-years:create");
  const input = parseCreateInput(data);

  let year = await prisma.academicYear.findFirst({
    where: { name: input.name, deletedAt: null },
  });

  if (!year) {
    year = await prisma.academicYear.create({
      data: {
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
      },
    });
  } else if (
    year.startDate.getTime() !== input.startDate.getTime() ||
    year.endDate.getTime() !== input.endDate.getTime()
  ) {
    throw new Error(
      "An academic year with this name already exists with different dates"
    );
  }

  const alreadyLinked = await prisma.academicYearSchool.findMany({
    where: {
      academicYearId: year.id,
      schoolId: { in: input.schoolIds },
      deletedAt: null,
    },
    select: { schoolId: true },
  });
  if (alreadyLinked.length > 0) {
    throw new Error("One or more selected schools are already linked to this year");
  }

  let calendarCreated = 0;
  for (const schoolId of input.schoolIds) {
    await assertAcademicYearSchoolAccess(user, schoolId);
    const schoolLink = await prisma.academicYearSchool.create({
      data: {
        schoolId,
        academicYearId: year.id,
        isActive: input.isActive,
      },
    });

    if (input.isActive) {
      await setSingleActiveYearSchool(schoolId, schoolLink.id);
    }

    if (input.generateCalendar) {
      const result = await generateCalendarDaysForYear(
        schoolLink.id,
        input.startDate,
        input.endDate
      );
      calendarCreated += result.created;
    }
  }

  await createAuditLog({
    userId: user.id,
    entity: "AcademicYear",
    entityId: year.id,
    action: "CREATE",
    newValues: {
      year,
      schoolIds: input.schoolIds,
      calendarDaysCreated: calendarCreated,
    } as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/academic-years");
  revalidatePath("/calendar");
  return {
    year,
    calendarResult: { created: calendarCreated, skipped: 0 },
  };
}

export async function updateAcademicYear(id: string, data: AcademicYearInput) {
  const user = await requirePermission("academic-years:update");
  await assertAcademicYearRecordAccess(user, id);

  const input = parseUpdateInput(data);

  const before = await prisma.academicYear.findUnique({ where: { id } });
  if (!before || before.deletedAt) throw new Error("Academic year not found");

  const duplicate = await prisma.academicYear.findFirst({
    where: {
      name: input.name,
      deletedAt: null,
      id: { not: id },
    },
  });
  if (duplicate) {
    throw new Error("An academic year with this name already exists");
  }

  const year = await prisma.academicYear.update({
    where: { id },
    data: {
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
    },
  });

  await syncSchoolLinks(id, input.schoolIds, user, {
    startDate: input.startDate,
    endDate: input.endDate,
    isActive: input.isActive,
    generateCalendar: input.generateCalendar,
  });

  await createAuditLog({
    userId: user.id,
    entity: "AcademicYear",
    entityId: year.id,
    action: "UPDATE",
    oldValues: before as unknown as Prisma.InputJsonValue,
    newValues: { year, schoolIds: input.schoolIds } as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/academic-years");
  revalidatePath(`/academic-years/${id}`);
  revalidatePath("/calendar");
  return year;
}

export async function deleteAcademicYear(id: string) {
  const user = await requirePermission("academic-years:delete");
  await assertAcademicYearRecordAccess(user, id);

  const before = await prisma.academicYear.findUnique({
    where: { id },
    include: {
      schoolLinks: { where: { deletedAt: null }, select: { id: true } },
    },
  });
  if (!before || before.deletedAt) throw new Error("Academic year not found");

  const linkIds = before.schoolLinks.map((link) => link.id);
  const enrollmentCount =
    linkIds.length > 0
      ? await prisma.studentEnrollment.count({
          where: { academicYearSchoolId: { in: linkIds }, deletedAt: null },
        })
      : 0;
  if (enrollmentCount > 0) {
    throw new Error("Cannot delete an academic year with enrollments");
  }

  const year = await prisma.academicYear.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await prisma.academicYearSchool.updateMany({
    where: { academicYearId: id, deletedAt: null },
    data: { deletedAt: new Date(), isActive: false },
  });

  await createAuditLog({
    userId: user.id,
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

  const schoolFilter = params.schoolId
    ? { schoolId: params.schoolId }
    : !user.roles.includes("NIGRA")
      ? { schoolId: { in: user.schoolIds } }
      : {};

  const where: Prisma.AcademicYearWhereInput = {
    deletedAt: null,
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    ...(Object.keys(schoolFilter).length > 0
      ? { schoolLinks: { some: { ...schoolFilter, deletedAt: null } } }
      : {}),
  };

  const [years, total] = await Promise.all([
    prisma.academicYear.findMany({
      where,
      orderBy: [{ startDate: "desc" }, { name: "asc" }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: {
        schoolLinks: {
          where: { deletedAt: null, ...schoolFilter },
          include: {
            school: { select: { id: true, name: true, code: true } },
            _count: {
              select: {
                calendarDays: { where: { deletedAt: null } },
                enrollments: { where: { deletedAt: null } },
              },
            },
          },
        },
      },
    }),
    prisma.academicYear.count({ where }),
  ]);

  const data = years.map((year) => {
    const calendarDays = year.schoolLinks.reduce(
      (sum, link) => sum + link._count.calendarDays,
      0
    );
    const enrollments = year.schoolLinks.reduce(
      (sum, link) => sum + link._count.enrollments,
      0
    );
    const activeLinks = year.schoolLinks.filter((link) => link.isActive);
    return {
      id: year.id,
      name: year.name,
      startDate: year.startDate,
      endDate: year.endDate,
      schoolLinks: year.schoolLinks,
      isActive: activeLinks.length > 0,
      activeSchoolNames: activeLinks.map((link) => link.school.code),
      linkedSchoolCount: year.schoolLinks.length,
      _count: { calendarDays, enrollments },
    };
  });

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

export async function getAcademicYearById(id: string, schoolId?: string) {
  const user = await requirePermission("academic-years:read");
  await assertAcademicYearRecordAccess(user, id);

  const resolvedSchoolId =
    schoolId ??
    (await getSelectedSchool(user))?.id ??
    (!user.roles.includes("NIGRA") ? user.schoolIds[0] : undefined);

  const linkWhere: Prisma.AcademicYearSchoolWhereInput = {
    deletedAt: null,
    ...(!user.roles.includes("NIGRA")
      ? { schoolId: { in: user.schoolIds } }
      : {}),
  };

  const year = await prisma.academicYear.findFirst({
    where: { id, deletedAt: null },
    include: {
      schoolLinks: {
        where: linkWhere,
        include: {
          school: true,
          _count: {
            select: {
              calendarDays: { where: { deletedAt: null } },
              enrollments: { where: { deletedAt: null } },
            },
          },
        },
        orderBy: { school: { code: "asc" } },
      },
    },
  });

  if (!year) return null;

  const schoolLink =
    (resolvedSchoolId
      ? year.schoolLinks.find((link) => link.schoolId === resolvedSchoolId)
      : undefined) ?? year.schoolLinks[0];

  if (schoolLink) {
    await requirePermission("academic-years:read", { schoolId: schoolLink.schoolId });
  }

  return {
    id: year.id,
    name: year.name,
    startDate: year.startDate,
    endDate: year.endDate,
    linkedSchoolIds: year.schoolLinks.map((link) => link.schoolId),
    schoolId: schoolLink?.schoolId,
    school: schoolLink?.school,
    academicYearSchoolId: schoolLink?.id,
    isActive: schoolLink?.isActive ?? false,
    _count: schoolLink?._count ?? { calendarDays: 0, enrollments: 0 },
    schoolLinks: year.schoolLinks,
  };
}

export async function getAcademicYearFormOptions() {
  const user = await requirePermission("academic-years:read");

  const schools = await prisma.school.findMany({
    where: user.roles.includes("NIGRA")
      ? { deletedAt: null, isActive: true }
      : { id: { in: user.schoolIds }, deletedAt: null, isActive: true },
    orderBy: [{ code: "asc" }, { name: "asc" }],
    select: { id: true, name: true, code: true },
  });

  return { schools };
}

export async function activateAcademicYear(id: string, schoolId: string) {
  const user = await requirePermission("academic-years:update");
  await assertAcademicYearRecordAccess(user, id);
  await assertAcademicYearSchoolAccess(user, schoolId);

  const schoolLink = await prisma.academicYearSchool.findFirst({
    where: { academicYearId: id, schoolId, deletedAt: null },
  });
  if (!schoolLink) {
    throw new Error("Academic year is not linked to this school");
  }

  const link = await prisma.academicYearSchool.update({
    where: { id: schoolLink.id },
    data: { isActive: true },
  });
  await setSingleActiveYearSchool(schoolId, link.id);

  await createAuditLog({
    userId: user.id,
    schoolId,
    entity: "AcademicYearSchool",
    entityId: link.id,
    action: "UPDATE",
    newValues: { isActive: true },
  });

  revalidatePath("/academic-years");
  return link;
}
