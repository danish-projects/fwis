import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/lib/auth/session";
import type { AcademicYearSummary } from "@/lib/academic-year/constants";

function toSummary(year: {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
}): AcademicYearSummary {
  return {
    id: year.id,
    name: year.name,
    startDate: year.startDate,
    endDate: year.endDate,
    label: year.name,
  };
}

export async function listAcademicYearsForUser(
  user: AuthUser
): Promise<AcademicYearSummary[]> {
  const years = await prisma.academicYear.findMany({
    where: user.roles.includes("SUPER_ADMIN")
      ? { deletedAt: null }
      : {
          deletedAt: null,
          schoolLinks: {
            some: {
              schoolId: { in: user.schoolIds },
              deletedAt: null,
            },
          },
        },
    orderBy: [{ startDate: "desc" }, { name: "asc" }],
  });

  return years.map((year) => toSummary(year));
}
