import type { SchoolSummary } from "@/lib/school/constants";

/** Keep classrooms for the sidebar-selected school only. */
export function filterClassroomsForSelectedSchool<
  T extends { schoolId: string },
>(classrooms: T[], selectedSchool: SchoolSummary | null): T[] {
  if (!selectedSchool) return [];
  return classrooms.filter(
    (classroom) => classroom.schoolId === selectedSchool.id
  );
}
