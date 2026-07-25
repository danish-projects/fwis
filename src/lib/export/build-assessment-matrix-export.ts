import type { AssessmentTypeCode } from "@/lib/setup-types";
import type { ScoreMatrixRow } from "@/lib/assessments/score-matrix-types";
import {
  ASSESSMENT_TYPE_LABELS,
  ASSESSMENT_TYPES,
} from "@/lib/validations/enrollment";

export function buildAssessmentMatrixExportRows(
  rows: ScoreMatrixRow[]
): Record<string, unknown>[] {
  return rows.map((row) => {
    const exported: Record<string, unknown> = {
      "Student Number": row.studentNumber ?? "",
      "Student Name": row.studentName,
      Gender: row.gender,
    };

    for (const type of ASSESSMENT_TYPES) {
      const label = ASSESSMENT_TYPE_LABELS[type];
      const score = row.scores[type as AssessmentTypeCode];
      exported[label] = score ?? "";
    }

    return exported;
  });
}
