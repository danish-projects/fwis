import type { AuthUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export async function assertLessonPlanGradeAccess(
  user: AuthUser,
  schoolId: string,
  gradeId: number
) {
  if (!hasPermission(user.roles, "lesson-plans:read")) {
    throw new Error("Forbidden");
  }

  const grade = await prisma.grade.findUnique({
    where: { id: gradeId },
    select: { id: true, name: true },
  });

  if (!grade) {
    throw new Error("Grade not found");
  }

  const schoolClassroom = await prisma.classroom.findFirst({
    where: {
      gradeId,
      deletedAt: null,
      isActive: true,
      schoolLinks: {
        some: { schoolId, deletedAt: null, isActive: true },
      },
    },
    select: { id: true },
  });

  if (!schoolClassroom) {
    throw new Error("Grade not found for this school");
  }

  if (user.roles.includes("NIGRA")) {
    return { grade, schoolId };
  }

  if (!user.schoolIds.includes(schoolId)) {
    throw new Error("Forbidden");
  }

  if (user.roles.includes("TEACHER")) {
    const hasGradeAccess = await prisma.classroom.findFirst({
      where: {
        gradeId,
        id: { in: user.classroomIds },
        deletedAt: null,
        isActive: true,
        schoolLinks: {
          some: { schoolId, deletedAt: null, isActive: true },
        },
      },
      select: { id: true },
    });

    if (!hasGradeAccess) {
      throw new Error("Forbidden");
    }
  }

  return { grade, schoolId };
}
