import type { AuthUser } from "@/lib/auth/session";
import { isSectionScopedAdmin } from "@/lib/auth/section-scope";

export async function assertTeacherSchoolAccess(
  user: AuthUser,
  schoolId: string
): Promise<void> {
  if (user.roles.includes("SUPER_ADMIN")) return;
  if (!user.schoolIds.includes(schoolId)) {
    throw new Error("Unauthorized school access");
  }
}

export async function assertTeacherRecordAccess(
  user: AuthUser,
  teacherId: string
): Promise<{ schoolId: string }> {
  const { prisma } = await import("@/lib/prisma");
  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, deletedAt: null },
    select: { schoolId: true, gender: true },
  });
  if (!teacher) throw new Error("Teacher not found");
  await assertTeacherSchoolAccess(user, teacher.schoolId);

  if (isSectionScopedAdmin(user) && user.gender && teacher.gender !== user.gender) {
    throw new Error("Unauthorized teacher access");
  }

  return teacher;
}
