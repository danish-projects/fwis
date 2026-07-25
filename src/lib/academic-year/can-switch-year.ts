import type { UserRoleCode } from "@prisma/client";
import { getPrimaryRole } from "@/lib/auth/permissions";

/** Teachers and substitutes are locked to the school's current academic year. */
export function canSwitchAcademicYear(roles: UserRoleCode[]): boolean {
  const primary = getPrimaryRole(roles);
  return primary !== "TEACHER" && primary !== "SUBSTITUTE";
}
