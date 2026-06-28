import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/lib/auth/session";
import type { AcademicYearSummary } from "@/lib/academic-year/constants";

function toSummary(year: {
  id: string;
  name: string;
  schoolId: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  school: { name: string };
}): AcademicYearSummary {
  return {
    id: year.id,
    name: year.name,
    schoolId: year.schoolId,
    schoolName: year.school.name,
    startDate: year.startDate,
    endDate: year.endDate,
    isActive: year.isActive,
    label: year.name,
  };
}

function dedupeByName(years: AcademicYearSummary[]): AcademicYearSummary[] {
  const seen = new Map<string, AcademicYearSummary>();
  for (const year of years) {
    if (!seen.has(year.name)) {
      seen.set(year.name, year);
    }
  }
  return [...seen.values()];
}

export async function listAcademicYearsForUser(
  user: AuthUser
): Promise<AcademicYearSummary[]> {
  const years = await prisma.academicYear.findMany({
    where: user.roles.includes("SUPER_ADMIN")
      ? { deletedAt: null }
      : { schoolId: { in: user.schoolIds }, deletedAt: null },
    orderBy: [{ startDate: "desc" }, { name: "asc" }],
    include: { school: { select: { name: true } } },
  });

  const summaries = years.map((year) => toSummary(year));
  return dedupeByName(summaries);
}
