import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/lib/auth/session";
import {
  ACADEMIC_YEAR_COOKIE,
  type AcademicYearSummary,
} from "@/lib/academic-year/constants";
import { canSwitchAcademicYear } from "@/lib/academic-year/can-switch-year";
import { findCurrentAcademicYearSchoolForSchool } from "@/lib/academic-year/find-current-year";
import { listAcademicYearsForUser } from "@/lib/academic-year/list-years";
import {
  calendarDateKey,
  schoolTodayKey,
} from "@/lib/calendar/calendar-date";

async function assertUserCanAccessYear(user: AuthUser, yearId: string) {
  const year = await prisma.academicYear.findFirst({
    where: { id: yearId, deletedAt: null },
    include: {
      schoolLinks: {
        where: { deletedAt: null },
        select: { schoolId: true },
      },
    },
  });
  if (!year) return null;

  if (
    !user.roles.includes("NIGRA") &&
    !year.schoolLinks.some((link) => user.schoolIds.includes(link.schoolId))
  ) {
    return null;
  }

  return year;
}

async function defaultYearForUser(
  user: AuthUser,
  available: AcademicYearSummary[]
): Promise<AcademicYearSummary | null> {
  if (available.length === 0) return null;

  const primarySchoolId = user.schoolIds[0];
  if (primarySchoolId) {
    const current = await findCurrentAcademicYearSchoolForSchool(primarySchoolId);
    if (current) {
      const match = available.find((y) => y.id === current.academicYearId);
      if (match) return match;
    }
  }

  const todayKey = schoolTodayKey();

  const byDate = available.find(
    (y) =>
      calendarDateKey(y.startDate) <= todayKey &&
      calendarDateKey(y.endDate) >= todayKey
  );
  if (byDate) return byDate;

  return available[0];
}

export async function resolveSelectedAcademicYear(
  user: AuthUser,
  cookieYearId?: string | null
): Promise<AcademicYearSummary | null> {
  const available = await listAcademicYearsForUser(user);
  if (available.length === 0) return null;

  // Teachers / substitutes: always current year — ignore cookie selection.
  if (!canSwitchAcademicYear(user.roles)) {
    return defaultYearForUser(user, available);
  }

  if (cookieYearId) {
    const allowed = await assertUserCanAccessYear(user, cookieYearId);
    if (allowed) {
      const match = available.find((y) => y.id === allowed.id);
      if (match) return match;
    }
  }

  return defaultYearForUser(user, available);
}

export async function getSelectedAcademicYear(
  user: AuthUser
): Promise<AcademicYearSummary | null> {
  const cookieStore = await cookies();
  const cookieYearId = canSwitchAcademicYear(user.roles)
    ? cookieStore.get(ACADEMIC_YEAR_COOKIE)?.value
    : null;
  return resolveSelectedAcademicYear(user, cookieYearId);
}

export async function resolveAcademicYearSchoolForSchool(
  schoolId: string,
  selectedYear: AcademicYearSummary | null
) {
  if (!schoolId) return null;

  if (selectedYear) {
    const schoolYear = await prisma.academicYearSchool.findFirst({
      where: {
        schoolId,
        academicYearId: selectedYear.id,
        deletedAt: null,
      },
      include: { academicYear: true },
    });
    if (schoolYear) return schoolYear;
  }

  return findCurrentAcademicYearSchoolForSchool(schoolId);
}

/** @deprecated Use resolveAcademicYearSchoolForSchool */
export const resolveAcademicYearForSchool = resolveAcademicYearSchoolForSchool;

export async function resolveAcademicYearSchoolIdsForSchools(
  schoolIds: string[],
  selectedYear: AcademicYearSummary | null
) {
  const map = new Map<string, string>();
  const validSchoolIds = schoolIds.filter((id) => Boolean(id));
  if (validSchoolIds.length === 0) return map;

  if (selectedYear) {
    const links = await prisma.academicYearSchool.findMany({
      where: {
        schoolId: { in: validSchoolIds },
        academicYearId: selectedYear.id,
        deletedAt: null,
      },
      select: { id: true, schoolId: true },
    });
    for (const link of links) {
      map.set(link.schoolId, link.id);
    }
  }

  const missing = validSchoolIds.filter((id) => !map.has(id));
  await Promise.all(
    missing.map(async (schoolId) => {
      const link = await findCurrentAcademicYearSchoolForSchool(schoolId);
      if (link) map.set(schoolId, link.id);
    })
  );

  return map;
}

/** @deprecated Use resolveAcademicYearSchoolIdsForSchools */
export const resolveAcademicYearIdsForSchools = resolveAcademicYearSchoolIdsForSchools;
