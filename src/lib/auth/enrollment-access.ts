import type { EnrollmentStatus } from "@/lib/setup-types";
import { Prisma } from "@prisma/client";
import type { AuthUser } from "@/lib/auth/session";
import {
  isClassroomScopedUser,
  mergeEnrollmentScope,
} from "@/lib/auth/section-scope";

export async function assertEnrollmentInScope(
  user: AuthUser,
  enrollmentId: string
): Promise<void> {
  if (!(await assertEnrollmentAccess(user, enrollmentId))) {
    throw new Error("Unauthorized enrollment access");
  }
}

export async function assertCalendarDayInSchool(
  calendarDayId: string,
  schoolId: string
): Promise<{ id: string; academicYearId: string }> {
  const { prisma } = await import("@/lib/prisma");
  const day = await prisma.academicCalendarDay.findFirst({
    where: {
      id: calendarDayId,
      deletedAt: null,
      academicYear: { schoolId, deletedAt: null },
    },
    select: { id: true, academicYearId: true },
  });
  if (!day) {
    throw new Error("Calendar day does not belong to this school");
  }
  return day;
}

export async function assertEnrollmentsBelongToClassroom(
  enrollmentIds: string[],
  classroomId: string
): Promise<void> {
  if (enrollmentIds.length === 0) return;

  const { prisma } = await import("@/lib/prisma");
  const count = await prisma.studentEnrollment.count({
    where: {
      id: { in: enrollmentIds },
      classroomId,
      deletedAt: null,
    },
  });

  if (count !== enrollmentIds.length) {
    throw new Error("One or more enrollments do not belong to this classroom");
  }
}

export async function assertUserSchoolAccess(
  user: AuthUser,
  schoolId: string
): Promise<void> {
  if (user.roles.includes("SUPER_ADMIN")) return;
  if (!user.schoolIds.includes(schoolId)) {
    throw new Error("Unauthorized school access");
  }
}

export function buildEnrollmentListFilter(
  user: AuthUser,
  options?: {
    search?: string;
    schoolId?: string;
    academicYearId?: string;
    academicYearName?: string;
    classroomId?: string;
    status?: string;
  }
): Prisma.StudentEnrollmentWhereInput {
  const base: Prisma.StudentEnrollmentWhereInput = {
    deletedAt: null,
    ...(options?.schoolId ? { schoolId: options.schoolId } : {}),
    ...(options?.academicYearId ? { academicYearId: options.academicYearId } : {}),
    ...(options?.academicYearName
      ? { academicYear: { name: options.academicYearName, deletedAt: null } }
      : {}),
    ...(options?.classroomId ? { classroomId: options.classroomId } : {}),
    ...(options?.status
      ? { status: options.status as EnrollmentStatus }
      : {}),
    ...(options?.search
      ? {
          student: {
            OR: [
              { firstName: { contains: options.search, mode: "insensitive" } },
              { lastName: { contains: options.search, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  return mergeEnrollmentScope(user, base);
}

export async function assertEnrollmentAccess(
  user: AuthUser,
  enrollmentId: string
): Promise<boolean> {
  if (user.roles.includes("SUPER_ADMIN")) return true;

  const { prisma } = await import("@/lib/prisma");
  const enrollment = await prisma.studentEnrollment.findUnique({
    where: { id: enrollmentId },
  });
  if (!enrollment || enrollment.deletedAt) return false;

  if (isClassroomScopedUser(user)) {
    return user.classroomIds.includes(enrollment.classroomId);
  }

  return user.schoolIds.includes(enrollment.schoolId);
}

export async function assertClassroomAccess(
  user: AuthUser,
  classroomId: string
): Promise<boolean> {
  if (user.roles.includes("SUPER_ADMIN")) return true;

  if (isClassroomScopedUser(user)) {
    return user.classroomIds.includes(classroomId);
  }

  const { prisma } = await import("@/lib/prisma");
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
  });
  if (!classroom) return false;
  return user.schoolIds.includes(classroom.schoolId);
}
