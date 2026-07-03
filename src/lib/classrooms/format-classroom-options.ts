type ClassroomForOption = {
  id: string;
  name: string;
  school: { name: string };
  grade?: { name: string; sortOrder?: number } | null;
  section?: { name: string } | null;
};

/** Build Grade dropdown labels. Optionally append school when listing multiple campuses. */
export function formatClassroomSwitcherOptions(
  classrooms: ClassroomForOption[],
  options?: { includeSchoolName?: boolean }
): Array<{ id: string; name: string }> {
  const multiSchool = new Set(classrooms.map((c) => c.school.name)).size > 1;
  const includeSchoolName = options?.includeSchoolName ?? multiSchool;

  const sorted = [...classrooms].sort((a, b) => {
    const schoolCmp = a.school.name.localeCompare(b.school.name);
    if (schoolCmp !== 0) return schoolCmp;
    const gradeA = a.grade?.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const gradeB = b.grade?.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (gradeA !== gradeB) return gradeA - gradeB;
    const sectionCmp = (a.section?.name ?? "").localeCompare(b.section?.name ?? "");
    if (sectionCmp !== 0) return sectionCmp;
    return a.name.localeCompare(b.name);
  });

  return sorted.map((c) => {
    const base =
      c.grade?.name && c.section?.name
        ? `${c.grade.name} ${c.section.name}`
        : c.name;
    return {
      id: c.id,
      name: includeSchoolName ? `${base} · ${c.school.name}` : base,
    };
  });
}
