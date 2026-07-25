import type { AuthUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import type { SchoolSummary } from "@/lib/school/constants";

export async function listSchoolsForUser(
  user: AuthUser
): Promise<SchoolSummary[]> {
  const schools = await prisma.school.findMany({
    where: user.roles.includes("NIGRA")
      ? { deletedAt: null, isActive: true }
      : { id: { in: user.schoolIds }, deletedAt: null, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true, city: true },
  });

  return schools;
}
