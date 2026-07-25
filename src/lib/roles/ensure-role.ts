import type { PrismaClient } from "@prisma/client";
import type { UserRoleCode } from "@prisma/client";
import { STAFF_ROLE_LABELS, type StaffPositionCode } from "@/lib/roles/staff-positions";

export async function ensureRoleByCode(
  prisma: PrismaClient,
  code: StaffPositionCode
) {
  const name = STAFF_ROLE_LABELS[code];
  return prisma.role.upsert({
    where: { code: code as UserRoleCode },
    update: { name },
    create: { code: code as UserRoleCode, name },
  });
}

export function isGlobalStaffRole(code: string): boolean {
  return code === "NIGRA";
}
