import { prisma } from "@/lib/prisma";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function findCurrentAcademicYearForSchool(
  schoolId: string,
  referenceDate = new Date()
) {
  const today = startOfDay(referenceDate);

  const byDateRange = await prisma.academicYear.findFirst({
    where: {
      schoolId,
      deletedAt: null,
      startDate: { lte: today },
      endDate: { gte: today },
    },
    orderBy: { startDate: "desc" },
  });
  if (byDateRange) return byDateRange;

  const byActive = await prisma.academicYear.findFirst({
    where: { schoolId, isActive: true, deletedAt: null },
    orderBy: { startDate: "desc" },
  });
  if (byActive) return byActive;

  return prisma.academicYear.findFirst({
    where: { schoolId, deletedAt: null },
    orderBy: { startDate: "desc" },
  });
}
