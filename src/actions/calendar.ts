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
  getSelectedAcademicYear,
  resolveAcademicYearSchoolForSchool,
} from "@/lib/academic-year/resolve-year";
import { generateCalendarDaysForYear } from "@/lib/calendar/bootstrap-calendar-days";
import { getSelectedSchool } from "@/lib/school/resolve-school";
import {
  calendarDateKey,
  parseCalendarDateInput,
} from "@/lib/calendar/calendar-date";
import { SESSION_TYPE_LABELS } from "@/lib/calendar/generate-sundays";
import { isAttendanceNeeded } from "@/lib/grades/attendance-percentage";
import { asSessionType } from "@/lib/setup-types";
import { formatDate } from "@/lib/utils";
import {
  calendarDaySchema,
  calendarDayUpdateSchema,
  type CalendarDayInput,
  type CalendarDayUpdateInput,
} from "@/lib/validations/calendar";

async function resolveSchoolLinkForGlobalYear(
  globalYearId: string,
  schoolId: string
) {
  return prisma.academicYearSchool.findFirst({
    where: {
      academicYearId: globalYearId,
      schoolId,
      deletedAt: null,
    },
    include: {
      academicYear: true,
      school: { select: { id: true, name: true } },
    },
  });
}

export async function getCalendarDays(globalYearId: string) {
  const user = await requirePermission("calendar:read");
  await assertAcademicYearRecordAccess(user, globalYearId);

  const selectedSchool = await getSelectedSchool(user);
  if (!selectedSchool) return null;

  const schoolLink = await resolveSchoolLinkForGlobalYear(
    globalYearId,
    selectedSchool.id
  );
  if (!schoolLink) return null;

  await requirePermission("calendar:read", { schoolId: schoolLink.schoolId });

  const calendarDays = await prisma.academicCalendarDay.findMany({
    where: { academicYearSchoolId: schoolLink.id, deletedAt: null },
    orderBy: { date: "asc" },
    include: {
      _count: { select: { attendance: { where: { deletedAt: null } } } },
    },
  });

  return {
    id: schoolLink.academicYear.id,
    name: schoolLink.academicYear.name,
    startDate: schoolLink.academicYear.startDate,
    endDate: schoolLink.academicYear.endDate,
    academicYearSchoolId: schoolLink.id,
    schoolId: schoolLink.schoolId,
    school: schoolLink.school,
    isActive: schoolLink.isActive,
    calendarDays,
  };
}

export async function getCalendarPageContext() {
  const user = await requirePermission("calendar:read");
  const [selectedSchool, selectedYear] = await Promise.all([
    getSelectedSchool(user),
    getSelectedAcademicYear(user),
  ]);

  if (!selectedSchool) {
    return {
      schoolId: null,
      academicYearId: null,
      academicYearSchoolId: null,
    };
  }

  const schoolYear = await resolveAcademicYearSchoolForSchool(
    selectedSchool.id,
    selectedYear
  );

  return {
    schoolId: selectedSchool.id,
    academicYearId: schoolYear?.academicYearId ?? null,
    academicYearSchoolId: schoolYear?.id ?? null,
  };
}

export async function bulkGenerateCalendarDays(globalYearId: string) {
  const user = await requirePermission("calendar:create");
  await assertAcademicYearRecordAccess(user, globalYearId);

  const selectedSchool = await getSelectedSchool(user);
  if (!selectedSchool) throw new Error("No school selected");

  const schoolLink = await resolveSchoolLinkForGlobalYear(
    globalYearId,
    selectedSchool.id
  );
  if (!schoolLink) {
    throw new Error("Academic year is not linked to the selected school");
  }

  const result = await generateCalendarDaysForYear(
    schoolLink.id,
    schoolLink.academicYear.startDate,
    schoolLink.academicYear.endDate
  );

  await createAuditLog({
    userId: user.id,
    schoolId: schoolLink.schoolId,
    entity: "AcademicCalendarDay",
    action: "CREATE",
    newValues: {
      academicYearSchoolId: schoolLink.id,
      academicYearId: globalYearId,
      ...result,
    },
  });

  revalidatePath("/calendar");
  revalidatePath("/academic-years");
  return result;
}

export async function createCalendarDay(data: CalendarDayInput) {
  const user = await requirePermission("calendar:create");
  const parsed = calendarDaySchema.parse(data);

  const schoolLink = await prisma.academicYearSchool.findFirst({
    where: { id: parsed.academicYearSchoolId, deletedAt: null },
    include: { academicYear: true },
  });
  if (!schoolLink) throw new Error("Academic year school link not found");

  await assertAcademicYearSchoolAccess(user, schoolLink.schoolId);

  const year = schoolLink.academicYear;
  const date = parseCalendarDateInput(parsed.date);
  const dateKey = calendarDateKey(date);
  const startKey = calendarDateKey(year.startDate);
  const endKey = calendarDateKey(year.endDate);
  if (dateKey < startKey || dateKey > endKey) {
    throw new Error(
      `Date must fall within the academic year (${formatDate(year.startDate)} – ${formatDate(year.endDate)})`
    );
  }

  const existing = await prisma.academicCalendarDay.findFirst({
    where: {
      academicYearSchoolId: parsed.academicYearSchoolId,
      date,
      deletedAt: null,
    },
    select: { sessionType: true },
  });
  if (existing) {
    const sessionLabel =
      SESSION_TYPE_LABELS[asSessionType(existing.sessionType)] ??
      existing.sessionType;
    throw new Error(
      `This date is already booked as ${sessionLabel}. Choose a different date or edit the existing calendar day.`
    );
  }

  const day = await prisma.academicCalendarDay.create({
    data: {
      academicYearSchoolId: parsed.academicYearSchoolId,
      date,
      lessonPlanNumber: isAttendanceNeeded(parsed.sessionType)
        ? parsed.lessonPlanNumber ?? null
        : null,
      sessionType: parsed.sessionType,
    },
  });

  await createAuditLog({
    userId: user.id,
    schoolId: schoolLink.schoolId,
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
    include: {
      academicYearSchool: { select: { schoolId: true, academicYearId: true } },
    },
  });
  if (!before) throw new Error("Calendar day not found");

  await assertAcademicYearRecordAccess(
    user,
    before.academicYearSchool.academicYearId
  );

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
    schoolId: before.academicYearSchool.schoolId,
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
      academicYearSchool: { select: { schoolId: true, academicYearId: true } },
      _count: { select: { attendance: { where: { deletedAt: null } } } },
    },
  });
  if (!before) throw new Error("Calendar day not found");

  await assertAcademicYearRecordAccess(
    user,
    before.academicYearSchool.academicYearId
  );

  if (before._count.attendance > 0) {
    throw new Error("Cannot delete a calendar day that has attendance records");
  }

  const day = await prisma.academicCalendarDay.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await createAuditLog({
    userId: user.id,
    schoolId: before.academicYearSchool.schoolId,
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
      academicYearSchool: {
        include: {
          academicYear: true,
          school: true,
        },
      },
      _count: { select: { attendance: { where: { deletedAt: null } } } },
    },
  });
  if (!day) return null;

  await assertAcademicYearRecordAccess(
    user,
    day.academicYearSchool.academicYearId
  );
  return day;
}
