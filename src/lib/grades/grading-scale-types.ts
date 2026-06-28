import type { AssessmentType } from "@/lib/setup-types";

export type GradingScaleWeights = Record<
  "attendance" | "behavior" | AssessmentType,
  number
>;

export type LetterBand = {
  letter: string;
  minPct: number;
};

export type GradingScaleConfig = {
  weights: GradingScaleWeights;
  letterBands: LetterBand[];
  passMinPct: number;
};

export const GRADING_SCALE_ID = "global";

/** Default weights (fractions 0–1). */
export const DEFAULT_GRADING_SCALE_WEIGHTS: GradingScaleWeights = {
  attendance: 0.1,
  behavior: 0.1,
  QUIZ_1: 0.05,
  QUIZ_2: 0.05,
  QUIZ_3: 0.05,
  QUIZ_4: 0.05,
  QUIZ_5: 0.05,
  MIDTERM_PROJECT: 0.15,
  FINAL_EXAM: 0.4,
};

export const DEFAULT_LETTER_BANDS: LetterBand[] = [
  { letter: "A", minPct: 90 },
  { letter: "B", minPct: 80 },
  { letter: "C", minPct: 70 },
  { letter: "D", minPct: 60 },
  { letter: "F", minPct: 0 },
];

export const DEFAULT_GRADING_SCALE: GradingScaleConfig = {
  weights: DEFAULT_GRADING_SCALE_WEIGHTS,
  letterBands: DEFAULT_LETTER_BANDS,
  passMinPct: 60,
};

export const ASSESSMENT_WEIGHT_KEYS: AssessmentType[] = [
  "QUIZ_1",
  "QUIZ_2",
  "QUIZ_3",
  "QUIZ_4",
  "QUIZ_5",
  "MIDTERM_PROJECT",
  "FINAL_EXAM",
];

/** @deprecated Use DEFAULT_GRADING_SCALE_WEIGHTS */
export const GRADE_WEIGHTS = DEFAULT_GRADING_SCALE_WEIGHTS;

export function weightsToPercentages(weights: GradingScaleWeights): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(weights)) {
    result[key] = Math.round(value * 10000) / 100;
  }
  return result;
}

export function percentagesToWeights(
  percentages: Record<string, number>
): GradingScaleWeights {
  const result = {} as GradingScaleWeights;
  for (const [key, value] of Object.entries(percentages)) {
    result[key as keyof GradingScaleWeights] = value / 100;
  }
  return result;
}

export function validateGradingScale(input: GradingScaleConfig): string | null {
  const weightSum = Object.values(input.weights).reduce((sum, w) => sum + w, 0);
  if (Math.abs(weightSum - 1) > 0.001) {
    return `Component weights must total 100% (currently ${Math.round(weightSum * 10000) / 100}%)`;
  }

  if (input.passMinPct < 0 || input.passMinPct > 100) {
    return "Pass threshold must be between 0 and 100";
  }

  const sorted = [...input.letterBands].sort((a, b) => b.minPct - a.minPct);
  if (sorted.length === 0) return "At least one letter grade band is required";

  for (const band of sorted) {
    if (!band.letter.trim()) return "Each letter grade must have a label";
    if (band.minPct < 0 || band.minPct > 100) {
      return "Letter grade thresholds must be between 0 and 100";
    }
  }

  return null;
}
