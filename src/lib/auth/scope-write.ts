import type { AuthUser } from "@/lib/auth/session";

/** Teachers must be assigned to a classroom before attendance/assessment writes. */
export function assertCanPerformScopedWrite(user: AuthUser): void {
  if (user.roles.includes("SUPER_ADMIN")) return;

  if (user.roles.includes("TEACHER") && user.classroomIds.length === 0) {
    throw new Error("You are not assigned to a classroom");
  }
}
