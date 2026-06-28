import type { AuthUser } from "@/lib/auth/session";
import { isClassroomScopedUser } from "@/lib/auth/section-scope";

export async function assertGradeRecordSchoolAccess(
  user: AuthUser,
  schoolId: string
): Promise<void> {
  if (user.roles.includes("SUPER_ADMIN")) return;
  if (!user.schoolIds.includes(schoolId)) {
    throw new Error("Unauthorized school access");
  }
}

export async function assertGradeRecordAccess(
  user: AuthUser,
  gradeRecordId: string
): Promise<{ schoolId: string }> {
  const { prisma } = await import("@/lib/prisma");
  const record = await prisma.classroom.findFirst({
    where: { id: gradeRecordId, deletedAt: null },
    select: { schoolId: true },
  });
  if (!record) throw new Error("Grade not found");
  await assertGradeRecordSchoolAccess(user, record.schoolId);

  if (isClassroomScopedUser(user) && !user.classroomIds.includes(gradeRecordId)) {
    throw new Error("Unauthorized grade access");
  }

  return record;
}
