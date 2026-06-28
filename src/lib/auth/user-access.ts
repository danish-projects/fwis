import type { UserRoleCode } from "@prisma/client";
import type { AuthUser } from "@/lib/auth/session";

export async function assertUserSchoolAccess(
  user: AuthUser,
  schoolIds: string[]
): Promise<void> {
  if (user.roles.includes("SUPER_ADMIN")) return;
  const unauthorized = schoolIds.some((id) => !user.schoolIds.includes(id));
  if (unauthorized) {
    throw new Error("Unauthorized school access");
  }
}

export function assertAssignableRoles(
  actor: AuthUser,
  roleCodes: UserRoleCode[]
): void {
  if (roleCodes.includes("SUPER_ADMIN") && !actor.roles.includes("SUPER_ADMIN")) {
    throw new Error("Only Super Admin can assign the Super Admin role");
  }
}

export async function assertUserRecordAccess(
  user: AuthUser,
  targetUserId: string
): Promise<{ id: string; email: string }> {
  const { prisma } = await import("@/lib/prisma");
  const target = await prisma.appUser.findUnique({
    where: { id: targetUserId },
    include: { schools: true },
  });
  if (!target) throw new Error("User not found");

  if (user.roles.includes("SUPER_ADMIN")) {
    return { id: target.id, email: target.email };
  }

  const targetSchoolIds = target.schools.map((s) => s.schoolId);
  const overlaps = targetSchoolIds.some((id) => user.schoolIds.includes(id));
  if (!overlaps && targetSchoolIds.length > 0) {
    throw new Error("Unauthorized user access");
  }
  if (targetSchoolIds.length === 0 && !user.roles.includes("SUPER_ADMIN")) {
    throw new Error("Unauthorized user access");
  }

  const targetRoles = await prisma.userRole.findMany({
    where: { userId: targetUserId },
    include: { role: true },
  });
  if (targetRoles.some((r) => r.role.code === "SUPER_ADMIN")) {
    throw new Error("Unauthorized user access");
  }

  return { id: target.id, email: target.email };
}
