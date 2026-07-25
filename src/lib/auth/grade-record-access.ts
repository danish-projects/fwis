import type { AuthUser } from "@/lib/auth/session";
import { isClassroomScopedUser } from "@/lib/auth/section-scope";

export async function assertGradeRecordSchoolAccess(
  user: AuthUser,
  schoolId: string
): Promise<void> {
  if (user.roles.includes("NIGRA")) return;
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
    select: {
      schoolLinks: {
        where: { deletedAt: null, isActive: true },
        select: { schoolId: true },
      },
    },
  });
  if (!record) throw new Error("Grade not found");

  const preferred =
    user.schoolIds.length > 0
      ? record.schoolLinks.find((link) => user.schoolIds.includes(link.schoolId))
      : undefined;
  const schoolId =
    preferred?.schoolId ??
    (user.roles.includes("NIGRA") ? record.schoolLinks[0]?.schoolId : undefined);

  if (!schoolId) throw new Error("Unauthorized school access");

  await assertGradeRecordSchoolAccess(user, schoolId);

  if (isClassroomScopedUser(user) && !user.classroomIds.includes(gradeRecordId)) {
    throw new Error("Unauthorized grade access");
  }

  return { schoolId };
}
