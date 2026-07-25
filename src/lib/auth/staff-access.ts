import type { AuthUser } from "@/lib/auth/session";
import { isSectionScopedAdmin } from "@/lib/auth/section-scope";

export async function assertStaffSchoolAccess(
  user: AuthUser,
  schoolId: string
): Promise<void> {
  if (user.roles.includes("NIGRA")) return;
  if (!user.schoolIds.includes(schoolId)) {
    throw new Error("Unauthorized school access");
  }
}

export async function assertStaffRecordAccess(
  user: AuthUser,
  staffId: string
): Promise<{ schoolId: string }> {
  const { prisma } = await import("@/lib/prisma");
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, deletedAt: null },
    select: { schoolId: true, gender: true },
  });
  if (!staff) throw new Error("Staff member not found");
  await assertStaffSchoolAccess(user, staff.schoolId);

  if (isSectionScopedAdmin(user) && user.gender && staff.gender !== user.gender) {
    throw new Error("Unauthorized staff access");
  }

  return staff;
}
