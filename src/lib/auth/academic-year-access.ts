import type { AuthUser } from "@/lib/auth/session";

export async function assertAcademicYearSchoolAccess(
  user: AuthUser,
  schoolId: string
): Promise<void> {
  if (user.roles.includes("SUPER_ADMIN")) return;
  if (!user.schoolIds.includes(schoolId)) {
    throw new Error("Unauthorized school access");
  }
}

export async function assertAcademicYearRecordAccess(
  user: AuthUser,
  academicYearId: string
): Promise<{ schoolIds: string[] }> {
  const { prisma } = await import("@/lib/prisma");
  const links = await prisma.academicYearSchool.findMany({
    where: { academicYearId, deletedAt: null },
    select: { schoolId: true },
  });
  if (links.length === 0) throw new Error("Academic year not found");

  const schoolIds = links.map((link) => link.schoolId);
  if (!user.roles.includes("SUPER_ADMIN")) {
    const allowed = schoolIds.some((id) => user.schoolIds.includes(id));
    if (!allowed) throw new Error("Unauthorized school access");
  }

  return { schoolIds };
}

export async function assertAcademicYearSchoolRecordAccess(
  user: AuthUser,
  academicYearSchoolId: string
): Promise<{ schoolId: string; academicYearId: string }> {
  const { prisma } = await import("@/lib/prisma");
  const link = await prisma.academicYearSchool.findFirst({
    where: { id: academicYearSchoolId, deletedAt: null },
    select: { schoolId: true, academicYearId: true },
  });
  if (!link) throw new Error("Academic year school link not found");
  await assertAcademicYearSchoolAccess(user, link.schoolId);
  return link;
}
