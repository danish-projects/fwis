import { prisma } from "@/lib/prisma";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function findCurrentAcademicYearSchoolForSchool(
  schoolId: string,
  referenceDate = new Date()
) {
  const today = startOfDay(referenceDate);

  const byDateRange = await prisma.academicYearSchool.findFirst({
    where: {
      schoolId,
      deletedAt: null,
      academicYear: {
        deletedAt: null,
        startDate: { lte: today },
        endDate: { gte: today },
      },
    },
    orderBy: { academicYear: { startDate: "desc" } },
    include: { academicYear: true },
  });
  if (byDateRange) return byDateRange;

  const byActive = await prisma.academicYearSchool.findFirst({
    where: { schoolId, isActive: true, deletedAt: null },
    orderBy: { academicYear: { startDate: "desc" } },
    include: { academicYear: true },
  });
  if (byActive) return byActive;

  return prisma.academicYearSchool.findFirst({
    where: { schoolId, deletedAt: null },
    orderBy: { academicYear: { startDate: "desc" } },
    include: { academicYear: true },
  });
}

/** @deprecated Use findCurrentAcademicYearSchoolForSchool */
export const findCurrentAcademicYearForSchool = findCurrentAcademicYearSchoolForSchool;
