/** Routes teachers are allowed to access (prefix match). */
export const TEACHER_ALLOWED_PATH_PREFIXES = [
  "/dashboard/teacher",
  "/teacher/attendance",
  "/teacher/assessments",
  "/teacher/lesson-plans",
  "/teacher/transcript",
  "/unauthorized",
] as const;

/** Profile only — not the students list or edit pages. */
const TEACHER_STUDENT_PROFILE_PATH =
  /^\/students\/[^/]+\/profile(?:\/|$)/;

export function isTeacherRouteAllowed(pathname: string): boolean {
  if (pathname === "/dashboard") return true;
  if (TEACHER_STUDENT_PROFILE_PATH.test(pathname)) return true;

  return TEACHER_ALLOWED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
