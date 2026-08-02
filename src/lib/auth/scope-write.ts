import type { AuthUser } from "@/lib/auth/session";
import { isTeacherOrSubstitute } from "@/lib/auth/permissions";

/** Teachers/substitutes must be assigned to a classroom before attendance/assessment writes. */
export function assertCanPerformScopedWrite(user: AuthUser): void {
  if (user.roles.includes("NIGRA")) return;

  if (isTeacherOrSubstitute(user.roles) && user.classroomIds.length === 0) {
    throw new Error("You are not assigned to a classroom");
  }
}
