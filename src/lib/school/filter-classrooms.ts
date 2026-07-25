import type { SchoolSummary } from "@/lib/school/constants";

type ClassroomSchoolRef = {
  id: string;
  schoolId?: string;
  schoolLinks?: { schoolId: string }[];
};

/** Keep classrooms for the sidebar-selected school only. */
export function filterClassroomsForSelectedSchool<T extends ClassroomSchoolRef>(
  classrooms: T[],
  selectedSchool: SchoolSummary | null
): T[] {
  if (!selectedSchool) return [];
  return classrooms.filter((classroom) => {
    // Prefer schoolId when set (one row per school after expanding schoolLinks).
    if (classroom.schoolId) {
      return classroom.schoolId === selectedSchool.id;
    }
    return (
      classroom.schoolLinks?.some(
        (link) => link.schoolId === selectedSchool.id
      ) ?? false
    );
  });
}
