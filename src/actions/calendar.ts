"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit/create-audit-log";
import { assertAcademicYearRecordAccess } from "@/lib/auth/academic-year-access";
import { getSelectedAcademicYear, resolveAcademicYearForSchool } from "@/lib/academic-year/resolve-year";
import { generateCalendarDaysForYear } from "@/lib/calendar/bootstrap-calendar-days";
import { isAttendanceNeeded } from "@/lib/grades/attendance-percentage";
import {
  calendarDaySchema,
  calendarDayUpdateSchema,
  type CalendarDayInput,
  type CalendarDayUpdateInput,
} from "@/lib/validations/calendar";

export async function getCalendarDays(academicYearId: string) {
  const user = await requirePermission("calendar:read");
  const { schoolId } = await assertAcademicYearRecordAccess(user, academicYearId);

  const year = await prisma.academicYear.findFirst({
    where: { id: academicYearId, deletedAt: null },
    include: {
      school: { select: { id: true, name: true } },
      calendarDays: {
        where: { deletedAt: null },
        orderBy: { date: "asc" },
        include: {
          _count: { select: { attendance: { where: { deletedAt: null } } } },
        },
      },
    },
  });

  if (!year) return null;
  await requirePermission("calendar:read", { schoolId });

  return year;
}

export async function getCalendarPageContext(schoolId?: string) {
  const user = await requirePermission("calendar:read");
  const selectedYear = await getSelectedAcademicYear(user);

  const schools = await prisma.school.findMany({
    where: user.roles.includes("SUPER_ADMIN")
      ? { deletedAt: null, isActive: true }
      : { id: { in: user.schoolIds }, deletedAt: null, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const resolvedSchoolId =
    schoolId && schools.some((s) => s.id === schoolId)
      ? schoolId
      : schools[0]?.id;

  let academicYearId: string | null = null;
  if (resolvedSchoolId) {
    const schoolYear = await resolveAcademicYearForSchool(
      resolvedSchoolId,
      selectedYear
    );
    academicYearId = schoolYear?.id ?? null;
  }

  const years = resolvedSchoolId
    ? await prisma.academicYear.findMany({
        where: { schoolId: resolvedSchoolId, deletedAt: null },
        orderBy: { startDate: "desc" },
        select: { id: true, name: true, isActive: true },
      })
    : [];

  return {
    schools,
    schoolId: resolvedSchoolId ?? null,
    academicYearId,
    years,
    showSchoolPicker: user.roles.includes("SUPER_ADMIN"),
  };
}

export async function bulkGenerateCalendarDays(academicYearId: string) {
  const user = await requirePermission("calendar:create");
  const { schoolId } = await assertAcademicYearRecordAccess(user, academicYearId);

  const year = await prisma.academicYear.findFirst({
    where: { id: academicYearId, deletedAt: null },
  });
  if (!year) throw new Error("Academic year not found");

  const result = await generateCalendarDaysForYear(
    academicYearId,
    year.startDate,
    year.endDate
  );

  await createAuditLog({
    userId: user.id,
    schoolId,
    entity: "AcademicCalendarDay",
    action: "CREATE",
    newValues: { academicYearId, ...result },
  });

  revalidatePath("/calendar");
  revalidatePath("/academic-years");
  return result;
}

export async function createCalendarDay(data: CalendarDayInput) {
  const user = await requirePermission("calendar:create");
  const parsed = calendarDaySchema.parse(data);
  const { schoolId } = await assertAcademicYearRecordAccess(
    user,
    parsed.academicYearId
  );

  const date = new Date(parsed.date);
  const existing = await prisma.academicCalendarDay.findFirst({
    where: {
      academicYearId: parsed.academicYearId,
      date,
      deletedAt: null,
    },
  });
  if (existing) throw new Error("A calendar day already exists for this date");

  const day = await prisma.academicCalendarDay.create({
    data: {
      academicYearId: parsed.academicYearId,
      date,
      lessonPlanNumber: isAttendanceNeeded(parsed.sessionType)
        ? parsed.lessonPlanNumber ?? null
        : null,
      sessionType: parsed.sessionType,
    },
  });

  await createAuditLog({
    userId: user.id,
    schoolId,
    entity: "AcademicCalendarDay",
    entityId: day.id,
    action: "CREATE",
    newValues: day as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/calendar");
  return day;
}

export async function updateCalendarDay(id: string, data: CalendarDayUpdateInput) {
  const user = await requirePermission("calendar:update");
  const parsed = calendarDayUpdateSchema.parse(data);

  const before = await prisma.academicCalendarDay.findFirst({
    where: { id, deletedAt: null },
    include: { academicYear: { select: { schoolId: true } } },
  });
  if (!before) throw new Error("Calendar day not found");

  await assertAcademicYearRecordAccess(user, before.academicYearId);

  const day = await prisma.academicCalendarDay.update({
    where: { id },
    data: {
      lessonPlanNumber: isAttendanceNeeded(parsed.sessionType)
        ? parsed.lessonPlanNumber ?? null
        : null,
      sessionType: parsed.sessionType,
    },
  });

  await createAuditLog({
    userId: user.id,
    schoolId: before.academicYear.schoolId,
    entity: "AcademicCalendarDay",
    entityId: day.id,
    action: "UPDATE",
    oldValues: before as unknown as Prisma.InputJsonValue,
    newValues: day as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/calendar");
  revalidatePath(`/calendar/${id}/edit`);
  return day;
}

export async function deleteCalendarDay(id: string) {
  const user = await requirePermission("calendar:delete");

  const before = await prisma.academicCalendarDay.findFirst({
    where: { id, deletedAt: null },
    include: {
      academicYear: { select: { schoolId: true } },
      _count: { select: { attendance: { where: { deletedAt: null } } } },
    },
  });
  if (!before) throw new Error("Calendar day not found");

  await assertAcademicYearRecordAccess(user, before.academicYearId);

  if (before._count.attendance > 0) {
    throw new Error("Cannot delete a calendar day that has attendance records");
  }

  const day = await prisma.academicCalendarDay.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await createAuditLog({
    userId: user.id,
    schoolId: before.academicYear.schoolId,
    entity: "AcademicCalendarDay",
    entityId: day.id,
    action: "DELETE",
    oldValues: before as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/calendar");
  return day;
}

export async function getCalendarDayById(id: string) {
  const user = await requirePermission("calendar:read");

  const day = await prisma.academicCalendarDay.findFirst({
    where: { id, deletedAt: null },
    include: {
      academicYear: { include: { school: true } },
      _count: { select: { attendance: { where: { deletedAt: null } } } },
    },
  });
  if (!day) return null;

  await assertAcademicYearRecordAccess(user, day.academicYearId);
  return day;
}
