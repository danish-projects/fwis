import { getPrimaryRole } from "@/lib/auth/permissions";
import type { AuthUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function getSidebarSchoolName(
  user: AuthUser
): Promise<string | null> {
  const role = getPrimaryRole(user.roles);
  if (role !== "SCHOOL_ADMIN" && role !== "TEACHER") {
    return null;
  }

  const schoolId = user.schoolIds[0];
  if (!schoolId) return null;

  const school = await prisma.school.findFirst({
    where: { id: schoolId, deletedAt: null },
    select: { name: true },
  });

  return school?.name ?? null;
}
