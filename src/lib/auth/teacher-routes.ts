/** Routes teachers are allowed to access (prefix match). */
export const TEACHER_ALLOWED_PATH_PREFIXES = [
  "/dashboard/teacher",
  "/teacher/attendance",
  "/teacher/assessments",
  "/unauthorized",
] as const;

export function isTeacherRouteAllowed(pathname: string): boolean {
  if (pathname === "/dashboard") return true;

  return TEACHER_ALLOWED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
