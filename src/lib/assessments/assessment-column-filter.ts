import type { AssessmentTypeCode } from "@/lib/setup-types";
import {
  ASSESSMENT_TYPE_LABELS,
  ASSESSMENT_TYPES,
  QUIZ_TYPES,
} from "@/lib/validations/enrollment";

export const ALL_ASSESSMENT_COLUMNS_VALUE = "all" as const;

export type AssessmentColumnFilter =
  | typeof ALL_ASSESSMENT_COLUMNS_VALUE
  | (typeof QUIZ_TYPES)[number]
  | "MIDTERM_PROJECT"
  | "FINAL_EXAM";

export const ASSESSMENT_COLUMN_FILTER_OPTIONS: Array<{
  value: AssessmentColumnFilter;
  label: string;
}> = [
  { value: ALL_ASSESSMENT_COLUMNS_VALUE, label: "All" },
  ...QUIZ_TYPES.map((type) => ({
    value: type as AssessmentColumnFilter,
    label: ASSESSMENT_TYPE_LABELS[type],
  })),
  { value: "MIDTERM_PROJECT", label: ASSESSMENT_TYPE_LABELS.MIDTERM_PROJECT },
  { value: "FINAL_EXAM", label: ASSESSMENT_TYPE_LABELS.FINAL_EXAM },
];

export function getVisibleAssessmentColumns(
  filter: AssessmentColumnFilter
): AssessmentTypeCode[] {
  if (filter === ALL_ASSESSMENT_COLUMNS_VALUE) {
    return [...ASSESSMENT_TYPES];
  }
  return [filter];
}

export function parseAssessmentColumnFilter(
  value: string | null | undefined
): AssessmentColumnFilter {
  if (!value) return ALL_ASSESSMENT_COLUMNS_VALUE;
  const match = ASSESSMENT_COLUMN_FILTER_OPTIONS.find(
    (option) => option.value === value
  );
  return match?.value ?? ALL_ASSESSMENT_COLUMNS_VALUE;
}
