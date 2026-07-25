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
import {
  buildDefaultCalendarDayPreview,
  generateCalendarDaysForYear,
} from "@/lib/calendar/bootstrap-calendar-days";
import { getSelectedSchool } from "@/lib/school/resolve-school";
import { listSchoolsForUser } from "@/lib/school/list-schools";
import {
  calendarDateKey,
  parseCalendarDateInput,
} from "@/lib/calendar/calendar-date";
import { SESSION_TYPE_LABELS } from "@/lib/calendar/generate-sundays";
import { isAttendanceNeeded } from "@/lib/grades/attendance-percentage";
import { asSessionType } from "@/lib/setup-types";
import { formatDate } from "@/lib/utils";
import {
  calendarBulkGenerateSchema,
  calendarDaySchema,
  calendarDayUpdateSchema,
  academicYearHolidaySchema,
  calendarCloneSchema,
  type CalendarBulkGenerateInput,
  type CalendarDayInput,
  type CalendarDayUpdateInput,
  type AcademicYearHolidayInput,
  type CalendarCloneInput,
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
      schools: [] as Array<{
        id: string;
        name: string;
        hasYearLink: boolean;
        hasCalendarDays: boolean;
      }>,
      previewDays: [] as ReturnType<typeof buildDefaultCalendarDayPreview>,
      holidays: [] as Array<{ id: string; date: string; name: string | null }>,
      academicYearName: null as string | null,
      startDate: null as string | null,
      endDate: null as string | null,
      sourceDayCount: 0,
    };
  }

  const schoolYear = await resolveAcademicYearSchoolForSchool(
    selectedSchool.id,
    selectedYear
  );

  const academicYearId = schoolYear?.academicYearId ?? null;
  const schools = await listSchoolsForUser(user);
  const schoolLinks = academicYearId
    ? await prisma.academicYearSchool.findMany({
        where: {
          academicYearId,
          schoolId: { in: schools.map((school) => school.id) },
          deletedAt: null,
        },
        select: {
          id: true,
          schoolId: true,
          _count: {
            select: {
              calendarDays: { where: { deletedAt: null } },
            },
          },
        },
      })
    : [];
  const linkBySchoolId = new Map(
    schoolLinks.map((link) => [link.schoolId, link])
  );

  const year = schoolYear?.academicYear;
  const holidayRows = academicYearId
    ? await prisma.academicYearHoliday.findMany({
        where: { academicYearId, deletedAt: null },
        orderBy: { date: "asc" },
        select: { id: true, date: true, name: true },
      })
    : [];
  const holidays = holidayRows.map((holiday) => ({
    id: holiday.id,
    date: calendarDateKey(holiday.date),
    name: holiday.name,
  }));
  const previewDays = year
    ? buildDefaultCalendarDayPreview(
        year.startDate,
        year.endDate,
        holidays.map((holiday) => holiday.date)
      )
    : [];

  const sourceLink = schoolYear
    ? linkBySchoolId.get(selectedSchool.id)
    : undefined;

  return {
    schoolId: selectedSchool.id,
    academicYearId,
    academicYearSchoolId: schoolYear?.id ?? null,
    schools: schools.map((school) => {
      const link = linkBySchoolId.get(school.id);
      return {
        id: school.id,
        name: school.name,
        hasYearLink: Boolean(link),
        hasCalendarDays: (link?._count.calendarDays ?? 0) > 0,
      };
    }),
    previewDays,
    holidays,
    academicYearName: year?.name ?? null,
    startDate: year ? calendarDateKey(year.startDate) : null,
    endDate: year ? calendarDateKey(year.endDate) : null,
    sourceDayCount: sourceLink?._count.calendarDays ?? 0,
  };
}

export async function bulkGenerateCalendarDays(data: CalendarBulkGenerateInput) {
  const user = await requirePermission("calendar:create");
  const parsed = calendarBulkGenerateSchema.parse(data);
  await assertAcademicYearRecordAccess(user, parsed.academicYearId);

  const selectedSchool = await getSelectedSchool(user);
  if (!selectedSchool) throw new Error("No school selected");

  const schoolIds = Array.from(
    new Set([selectedSchool.id, ...parsed.schoolIds])
  );

  const availableSchools = await listSchoolsForUser(user);
  const availableIds = new Set(availableSchools.map((school) => school.id));

  for (const schoolId of schoolIds) {
    if (!availableIds.has(schoolId)) {
      throw new Error("One or more selected schools are not available");
    }
    await requirePermission("calendar:create", { schoolId });
  }

  const year = await prisma.academicYear.findFirst({
    where: { id: parsed.academicYearId, deletedAt: null },
  });
  if (!year) throw new Error("Academic year not found");

  const startKey = calendarDateKey(year.startDate);
  const endKey = calendarDateKey(year.endDate);
  for (const day of parsed.days) {
    if (day.date < startKey || day.date > endKey) {
      throw new Error(
        `Date ${day.date} must fall within the academic year (${formatDate(year.startDate)} – ${formatDate(year.endDate)})`
      );
    }
  }

  const schoolLinks = await prisma.academicYearSchool.findMany({
    where: {
      academicYearId: parsed.academicYearId,
      schoolId: { in: schoolIds },
      deletedAt: null,
    },
    include: { school: { select: { id: true, name: true } } },
  });

  const linkBySchoolId = new Map(
    schoolLinks.map((link) => [link.schoolId, link])
  );

  const missing = schoolIds.filter((schoolId) => !linkBySchoolId.has(schoolId));
  if (missing.length > 0) {
    throw new Error(
      "Academic year is not linked to one or more selected schools"
    );
  }

  const schoolResults: Array<{
    schoolId: string;
    schoolName: string;
    created: number;
    skipped: number;
  }> = [];

  let created = 0;
  let skipped = 0;

  for (const schoolId of schoolIds) {
    const schoolLink = linkBySchoolId.get(schoolId)!;
    const result = await generateCalendarDaysForYear(
      schoolLink.id,
      year.startDate,
      year.endDate,
      parsed.days
    );
    created += result.created;
    skipped += result.skipped;
    schoolResults.push({
      schoolId,
      schoolName: schoolLink.school.name,
      ...result,
    });

    await createAuditLog({
      userId: user.id,
      schoolId,
      entity: "AcademicCalendarDay",
      action: "CREATE",
      newValues: {
        academicYearSchoolId: schoolLink.id,
        academicYearId: parsed.academicYearId,
        dayCount: parsed.days.length,
        ...result,
      },
    });
  }

  revalidatePath("/calendar");
  revalidatePath("/academic-years");
  return { created, skipped, schools: schoolResults };
}

export async function cloneCalendarToSchools(data: CalendarCloneInput) {
  const user = await requirePermission("calendar:create");
  const parsed = calendarCloneSchema.parse(data);
  await assertAcademicYearRecordAccess(user, parsed.academicYearId);

  const selectedSchool = await getSelectedSchool(user);
  if (!selectedSchool) throw new Error("No school selected");

  const targetSchoolIds = Array.from(
    new Set(parsed.targetSchoolIds.filter((id) => id !== selectedSchool.id))
  );
  if (targetSchoolIds.length === 0) {
    throw new Error("Select at least one other school");
  }

  const availableSchools = await listSchoolsForUser(user);
  const availableIds = new Set(availableSchools.map((school) => school.id));
  for (const schoolId of targetSchoolIds) {
    if (!availableIds.has(schoolId)) {
      throw new Error("One or more selected schools are not available");
    }
    await requirePermission("calendar:create", { schoolId });
  }

  const sourceLink = await resolveSchoolLinkForGlobalYear(
    parsed.academicYearId,
    selectedSchool.id
  );
  if (!sourceLink) {
    throw new Error("Academic year is not linked to the current school");
  }

  const sourceDays = await prisma.academicCalendarDay.findMany({
    where: { academicYearSchoolId: sourceLink.id, deletedAt: null },
    orderBy: { date: "asc" },
    select: {
      date: true,
      sessionType: true,
      lessonPlanNumber: true,
    },
  });
  if (sourceDays.length === 0) {
    throw new Error(
      "Current school has no calendar days to clone. Generate a calendar first."
    );
  }

  const targetLinks = await prisma.academicYearSchool.findMany({
    where: {
      academicYearId: parsed.academicYearId,
      schoolId: { in: targetSchoolIds },
      deletedAt: null,
    },
    include: {
      school: { select: { id: true, name: true } },
      _count: {
        select: { calendarDays: { where: { deletedAt: null } } },
      },
    },
  });
  const linkBySchoolId = new Map(
    targetLinks.map((link) => [link.schoolId, link])
  );

  const missingLinks = targetSchoolIds.filter((id) => !linkBySchoolId.has(id));
  if (missingLinks.length > 0) {
    throw new Error(
      "Academic year is not linked to one or more selected schools"
    );
  }

  const alreadyHasDays = targetLinks.filter(
    (link) => link._count.calendarDays > 0
  );
  if (alreadyHasDays.length > 0) {
    const names = alreadyHasDays.map((link) => link.school.name).join(", ");
    throw new Error(
      `Cannot clone: these schools already have calendar days (${names}). Clear them first or pick empty schools.`
    );
  }

  const results: Array<{
    schoolId: string;
    schoolName: string;
    created: number;
  }> = [];

  for (const schoolId of targetSchoolIds) {
    const link = linkBySchoolId.get(schoolId)!;
    await prisma.academicCalendarDay.createMany({
      data: sourceDays.map((day) => ({
        academicYearSchoolId: link.id,
        date: day.date,
        sessionType: day.sessionType,
        lessonPlanNumber: day.lessonPlanNumber,
      })),
    });

    results.push({
      schoolId,
      schoolName: link.school.name,
      created: sourceDays.length,
    });

    await createAuditLog({
      userId: user.id,
      schoolId,
      entity: "AcademicCalendarDay",
      action: "CREATE",
      newValues: {
        clonedFromSchoolId: selectedSchool.id,
        academicYearId: parsed.academicYearId,
        academicYearSchoolId: link.id,
        created: sourceDays.length,
      },
    });
  }

  revalidatePath("/calendar");
  revalidatePath("/academic-years");
  return {
    dayCount: sourceDays.length,
    schools: results,
  };
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

export async function listAcademicYearHolidays(academicYearId: string) {
  const user = await requirePermission("calendar:read");
  await assertAcademicYearRecordAccess(user, academicYearId);

  const holidays = await prisma.academicYearHoliday.findMany({
    where: { academicYearId, deletedAt: null },
    orderBy: { date: "asc" },
  });

  return holidays.map((holiday) => ({
    id: holiday.id,
    date: calendarDateKey(holiday.date),
    name: holiday.name,
  }));
}

export async function createAcademicYearHoliday(data: AcademicYearHolidayInput) {
  const user = await requirePermission("calendar:create");
  const parsed = academicYearHolidaySchema.parse(data);
  await assertAcademicYearRecordAccess(user, parsed.academicYearId);

  const year = await prisma.academicYear.findFirst({
    where: { id: parsed.academicYearId, deletedAt: null },
  });
  if (!year) throw new Error("Academic year not found");

  const date = parseCalendarDateInput(parsed.date);
  const dateKey = calendarDateKey(date);
  const startKey = calendarDateKey(year.startDate);
  const endKey = calendarDateKey(year.endDate);
  if (dateKey < startKey || dateKey > endKey) {
    throw new Error(
      `Date must fall within the academic year (${formatDate(year.startDate)} – ${formatDate(year.endDate)})`
    );
  }
  if (date.getUTCDay() !== 0) {
    throw new Error("Holiday date must be a Sunday");
  }

  const existing = await prisma.academicYearHoliday.findFirst({
    where: {
      academicYearId: parsed.academicYearId,
      date,
    },
  });
  if (existing && !existing.deletedAt) {
    throw new Error("This Sunday is already listed as a holiday");
  }

  const holiday = existing
    ? await prisma.academicYearHoliday.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          name: parsed.name?.trim() ? parsed.name.trim() : null,
        },
      })
    : await prisma.academicYearHoliday.create({
        data: {
          academicYearId: parsed.academicYearId,
          date,
          name: parsed.name?.trim() ? parsed.name.trim() : null,
        },
      });

  await createAuditLog({
    userId: user.id,
    entity: "AcademicYearHoliday",
    entityId: holiday.id,
    action: "CREATE",
    newValues: holiday as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/calendar");
  revalidatePath("/calendar/holidays");
  return {
    id: holiday.id,
    date: calendarDateKey(holiday.date),
    name: holiday.name,
  };
}

export async function deleteAcademicYearHoliday(id: string) {
  const user = await requirePermission("calendar:delete");

  const before = await prisma.academicYearHoliday.findFirst({
    where: { id, deletedAt: null },
  });
  if (!before) throw new Error("Holiday not found");

  await assertAcademicYearRecordAccess(user, before.academicYearId);

  const holiday = await prisma.academicYearHoliday.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await createAuditLog({
    userId: user.id,
    entity: "AcademicYearHoliday",
    entityId: holiday.id,
    action: "DELETE",
    oldValues: before as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/calendar");
  revalidatePath("/calendar/holidays");
  return holiday;
}
