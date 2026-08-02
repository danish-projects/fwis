/**
 * Canonical student list order for attendance, transcript, rankings, etc.
 * Display remains "First Last"; sort is last name, then first name.
 */

export const STUDENT_NAME_ORDER_BY = [
  { lastName: "asc" as const },
  { firstName: "asc" as const },
];

/** Prisma `orderBy` when querying StudentEnrollment rows. */
export const ENROLLMENT_BY_STUDENT_NAME_ORDER_BY = [
  { student: { lastName: "asc" as const } },
  { student: { firstName: "asc" as const } },
];

export type StudentNameParts = {
  firstName: string;
  lastName: string;
};

export function compareStudentNames(
  a: StudentNameParts,
  b: StudentNameParts
): number {
  return (
    a.lastName.localeCompare(b.lastName, undefined, { sensitivity: "base" }) ||
    a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" })
  );
}

/** Higher score first; ties broken by student name (last, then first). */
export function compareByScoreThenStudentName<
  T extends StudentNameParts & Record<ScoreKey, number>,
  ScoreKey extends string,
>(a: T, b: T, scoreKey: ScoreKey): number {
  const scoreDiff = b[scoreKey] - a[scoreKey];
  if (scoreDiff !== 0) return scoreDiff;
  return compareStudentNames(a, b);
}
