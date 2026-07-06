export function gradeNameToSlug(gradeName: string): string {
  return gradeName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolveGradeIdFromParam(
  grades: Array<{ id: number; name: string }>,
  gradeParam: string | undefined
): number | undefined {
  if (!gradeParam) return undefined;

  const slug = gradeParam.trim().toLowerCase();
  const bySlug = grades.find((grade) => gradeNameToSlug(grade.name) === slug);
  if (bySlug) return bySlug.id;

  // Backward compatibility for old numeric URLs like ?grade=2
  const numericId = Number(gradeParam);
  if (Number.isFinite(numericId) && grades.some((grade) => grade.id === numericId)) {
    return numericId;
  }

  return undefined;
}

export function buildLessonPlanPagePath(
  pagePath: string,
  gradeName: string | null,
  lessonPlanNumber: number | null
): string {
  const params = new URLSearchParams();
  if (gradeName) params.set("grade", gradeNameToSlug(gradeName));
  if (lessonPlanNumber != null) params.set("week", String(lessonPlanNumber));
  const query = params.toString();
  return query ? `${pagePath}?${query}` : pagePath;
}

export function lessonPlanParamsNeedRedirect(
  searchParams: { grade?: string; week?: string },
  selectedGradeName: string | null,
  selectedLessonPlanNumber: number | null
): boolean {
  const expectedGradeSlug = selectedGradeName
    ? gradeNameToSlug(selectedGradeName)
    : null;
  const actualGradeSlug = searchParams.grade?.trim().toLowerCase() ?? null;

  if (expectedGradeSlug !== actualGradeSlug) {
    return true;
  }

  const expectedWeek =
    selectedLessonPlanNumber != null ? String(selectedLessonPlanNumber) : null;
  const actualWeek = searchParams.week ?? null;

  return expectedWeek !== actualWeek;
}
