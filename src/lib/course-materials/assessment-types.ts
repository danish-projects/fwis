import {
  ASSESSMENT_TYPE_LABELS,
  QUIZ_TYPES,
} from "@/lib/validations/enrollment";

export const COURSE_MATERIAL_ASSESSMENT_TYPES = [
  ...QUIZ_TYPES,
  "FINAL_EXAM",
] as const;

export type CourseMaterialAssessmentType =
  (typeof COURSE_MATERIAL_ASSESSMENT_TYPES)[number];

export const COURSE_MATERIAL_ASSESSMENT_OPTIONS =
  COURSE_MATERIAL_ASSESSMENT_TYPES.map((type) => ({
    value: type,
    label: ASSESSMENT_TYPE_LABELS[type],
  }));

/** Drive folder name under Assessments/, e.g. "Quiz 1" or "Final Exam". */
export function courseMaterialAssessmentFolderName(
  type: CourseMaterialAssessmentType
): string {
  return ASSESSMENT_TYPE_LABELS[type];
}

export function parseCourseMaterialAssessmentType(
  value: string | null | undefined
): CourseMaterialAssessmentType | null {
  if (!value) return null;
  return (COURSE_MATERIAL_ASSESSMENT_TYPES as readonly string[]).includes(value)
    ? (value as CourseMaterialAssessmentType)
    : null;
}
