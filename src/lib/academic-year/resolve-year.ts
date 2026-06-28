import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/lib/auth/session";
import {
  ACADEMIC_YEAR_COOKIE,
  type AcademicYearSummary,
} from "@/lib/academic-year/constants";
import { findCurrentAcademicYearForSchool } from "@/lib/academic-year/find-current-year";
import { listAcademicYearsForUser } from "@/lib/academic-year/list-years";

async function assertUserCanAccessYear(user: AuthUser, yearId: string) {
  const year = await prisma.academicYear.findFirst({
    where: { id: yearId, deletedAt: null },
    include: { school: { select: { name: true } } },
  });
  if (!year) return null;

  if (
    !user.roles.includes("SUPER_ADMIN") &&
    !user.schoolIds.includes(year.schoolId)
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
    const current = await findCurrentAcademicYearForSchool(primarySchoolId);
    if (current) {
      const match =
        available.find((y) => y.id === current.id) ??
        available.find((y) => y.name === current.name);
      if (match) return match;
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const byDate = available.find(
    (y) => y.startDate <= today && y.endDate >= today
  );
  if (byDate) return byDate;

  const byActive = available.find((y) => y.isActive);
  if (byActive) return byActive;

  return available[0];
}

export async function resolveSelectedAcademicYear(
  user: AuthUser,
  cookieYearId?: string | null
): Promise<AcademicYearSummary | null> {
  const available = await listAcademicYearsForUser(user);
  if (available.length === 0) return null;

  if (cookieYearId) {
    const allowed = await assertUserCanAccessYear(user, cookieYearId);
    if (allowed) {
      const match =
        available.find((y) => y.id === allowed.id) ??
        available.find((y) => y.name === allowed.name);
      if (match) return match;
    }
  }

  return defaultYearForUser(user, available);
}

export async function getSelectedAcademicYear(
  user: AuthUser
): Promise<AcademicYearSummary | null> {
  const cookieStore = await cookies();
  const cookieYearId = cookieStore.get(ACADEMIC_YEAR_COOKIE)?.value;
  return resolveSelectedAcademicYear(user, cookieYearId);
}

export async function resolveAcademicYearForSchool(
  schoolId: string,
  selectedYear: AcademicYearSummary | null
) {
  if (selectedYear) {
    const schoolYear = await prisma.academicYear.findFirst({
      where: {
        schoolId,
        name: selectedYear.name,
        deletedAt: null,
      },
      orderBy: { startDate: "desc" },
    });
    if (schoolYear) return schoolYear;
  }

  return findCurrentAcademicYearForSchool(schoolId);
}

export async function resolveAcademicYearIdsForSchools(
  schoolIds: string[],
  selectedYear: AcademicYearSummary | null
) {
  const map = new Map<string, string>();
  if (schoolIds.length === 0) return map;

  if (selectedYear) {
    const years = await prisma.academicYear.findMany({
      where: {
        schoolId: { in: schoolIds },
        name: selectedYear.name,
        deletedAt: null,
      },
      orderBy: { startDate: "desc" },
      select: { id: true, schoolId: true },
    });
    for (const year of years) {
      if (!map.has(year.schoolId)) map.set(year.schoolId, year.id);
    }
  }

  const missing = schoolIds.filter((id) => !map.has(id));
  await Promise.all(
    missing.map(async (schoolId) => {
      const year = await findCurrentAcademicYearForSchool(schoolId);
      if (year) map.set(schoolId, year.id);
    })
  );

  return map;
}
