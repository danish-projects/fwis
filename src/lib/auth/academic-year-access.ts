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
): Promise<{ schoolId: string }> {
  const { prisma } = await import("@/lib/prisma");
  const year = await prisma.academicYear.findFirst({
    where: { id: academicYearId, deletedAt: null },
    select: { schoolId: true },
  });
  if (!year) throw new Error("Academic year not found");
  await assertAcademicYearSchoolAccess(user, year.schoolId);
  return year;
}
