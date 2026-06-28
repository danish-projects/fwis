import type { AssessmentType } from "@/lib/setup-types";
import {
  ASSESSMENT_WEIGHT_KEYS,
  DEFAULT_GRADING_SCALE,
  type GradingScaleConfig,
  type GradingScaleWeights,
} from "@/lib/grades/grading-scale-types";

export type { GradingScaleConfig, GradingScaleWeights, LetterBand } from "@/lib/grades/grading-scale-types";
export {
  DEFAULT_GRADING_SCALE,
  DEFAULT_GRADING_SCALE_WEIGHTS,
  GRADE_WEIGHTS,
  GRADING_SCALE_ID,
  weightsToPercentages,
  percentagesToWeights,
  validateGradingScale,
} from "@/lib/grades/grading-scale-types";

const ASSESSMENT_TYPES: AssessmentType[] = [...ASSESSMENT_WEIGHT_KEYS];

export function letterGrade(
  pct: number,
  scale: GradingScaleConfig = DEFAULT_GRADING_SCALE
): string {
  const sorted = [...scale.letterBands].sort((a, b) => b.minPct - a.minPct);
  for (const band of sorted) {
    if (pct >= band.minPct) return band.letter;
  }
  return sorted[sorted.length - 1]?.letter ?? "F";
}

export function passFail(
  pct: number,
  scale: GradingScaleConfig = DEFAULT_GRADING_SCALE
): "Pass" | "Fail" {
  return pct >= scale.passMinPct ? "Pass" : "Fail";
}

export function calculateFinalPercentage(
  input: {
    attendancePct: number;
    behaviorPct: number;
    scores: Partial<Record<AssessmentType, number>>;
  },
  scale: GradingScaleConfig = DEFAULT_GRADING_SCALE
): number {
  const { weights } = scale;
  let total =
    input.attendancePct * weights.attendance +
    input.behaviorPct * weights.behavior;

  for (const type of ASSESSMENT_TYPES) {
    total += (input.scores[type] ?? 0) * weights[type];
  }

  return Math.round(total * 100) / 100;
}

export type FinalGradeBreakdownPart = {
  label: string;
  score: number;
  weightPct: number;
  contribution: number;
};

export function getFinalGradeBreakdown(
  input: {
    attendancePct: number;
    behaviorPct: number;
    scores: Partial<Record<AssessmentType, number>>;
  },
  scale: GradingScaleConfig = DEFAULT_GRADING_SCALE
): { parts: FinalGradeBreakdownPart[]; finalPct: number } {
  const { weights } = scale;

  const parts: FinalGradeBreakdownPart[] = [
    {
      label: "Attendance",
      score: input.attendancePct,
      weightPct: weights.attendance * 100,
      contribution: input.attendancePct * weights.attendance,
    },
    {
      label: "Behavior",
      score: input.behaviorPct,
      weightPct: weights.behavior * 100,
      contribution: input.behaviorPct * weights.behavior,
    },
    ...ASSESSMENT_TYPES.map((type) => ({
      label: type.replace(/_/g, " "),
      score: input.scores[type] ?? 0,
      weightPct: weights[type] * 100,
      contribution: (input.scores[type] ?? 0) * weights[type],
    })),
  ];

  const finalPct =
    Math.round(parts.reduce((sum, part) => sum + part.contribution, 0) * 100) / 100;

  return { parts, finalPct };
}

export function calculateSchoolHealthScore(input: {
  attendancePct: number;
  academicPct: number;
  behaviorPct: number;
}): number {
  return Math.round(
    (input.attendancePct * 0.4 +
      input.academicPct * 0.4 +
      input.behaviorPct * 0.2) *
      100
  ) / 100;
}

export const GRADE_PROMOTION: Record<number, number | null> = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 6,
  6: null,
};

export function buildFinalGradeFormula(scale: GradingScaleConfig): string {
  const { weights } = scale;
  const terms = [
    `Attendance% × ${Math.round(weights.attendance * 100)}%`,
    `Behavior% × ${Math.round(weights.behavior * 100)}%`,
    ...ASSESSMENT_TYPES.map(
      (type) =>
        `${type.replace(/_/g, " ")} × ${Math.round(weights[type] * 100)}%`
    ),
  ];
  return `Final % = ${terms.join(" + ")}`;
}
