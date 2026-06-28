import type { BehaviorRatingCode } from "../../../prisma/lookup-data";

/** Base behavior score when no weekly ratings exist (Meets Expectations). */
export const BEHAVIOR_BASE_SCORE = 85;

/** Behavior weight toward final report card (10%). */
export const BEHAVIOR_REPORT_WEIGHT = 0.1;

export const BEHAVIOR_RATING_ADJUSTMENTS: Record<BehaviorRatingCode, number> = {
  OUTSTANDING: 3,
  EXCELLENT: 2,
  VERY_GOOD: 1,
  MEETS_EXPECTATIONS: 0,
  NEEDS_IMPROVEMENT: -2,
  UNSATISFACTORY: -5,
};

export const BEHAVIOR_RATING_LABELS: Record<BehaviorRatingCode, string> = {
  OUTSTANDING: "Outstanding",
  EXCELLENT: "Excellent",
  VERY_GOOD: "Very Good",
  MEETS_EXPECTATIONS: "Meets Expectations",
  NEEDS_IMPROVEMENT: "Needs Improvement",
  UNSATISFACTORY: "Unsatisfactory",
};

export type BehaviorScoreResult = {
  score: number;
  level: string;
  ratingCount: number;
  totalAdjustment: number;
  contribution: number;
  weightPct: number;
};

function clampScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score * 100) / 100));
}

function formatAdjustment(adjustment: number): string {
  return adjustment > 0 ? `+${adjustment}` : String(adjustment);
}

export class BehaviorCalculationService {
  static getAdjustment(rating: BehaviorRatingCode): number {
    return BEHAVIOR_RATING_ADJUSTMENTS[rating];
  }

  static getRatingLabel(rating: BehaviorRatingCode): string {
    return BEHAVIOR_RATING_LABELS[rating];
  }

  static getRatingOptionLabel(rating: BehaviorRatingCode): string {
    const adjustment = BEHAVIOR_RATING_ADJUSTMENTS[rating];
    return `${formatAdjustment(adjustment)} ${BEHAVIOR_RATING_LABELS[rating]}`;
  }

  /** Sum weekly adjustments on top of base score 85; default 85 when no ratings. */
  static calculateScore(ratings: BehaviorRatingCode[]): number {
    if (ratings.length === 0) return BEHAVIOR_BASE_SCORE;
    const totalAdjustment = ratings.reduce(
      (sum, rating) => sum + BEHAVIOR_RATING_ADJUSTMENTS[rating],
      0
    );
    return clampScore(BEHAVIOR_BASE_SCORE + totalAdjustment);
  }

  static calculateFromRaw(
    rawRatings: Array<string | null | undefined>
  ): number {
    const ratings = rawRatings.filter(
      (value): value is BehaviorRatingCode => Boolean(value)
    );
    return this.calculateScore(ratings);
  }

  /** Map calculated score to a parent-friendly behavior level. */
  static levelForScore(score: number): string {
    if (score >= 94) return BEHAVIOR_RATING_LABELS.OUTSTANDING;
    if (score >= 90) return BEHAVIOR_RATING_LABELS.EXCELLENT;
    if (score >= 87) return BEHAVIOR_RATING_LABELS.VERY_GOOD;
    if (score >= 80) return BEHAVIOR_RATING_LABELS.MEETS_EXPECTATIONS;
    if (score >= 70) return BEHAVIOR_RATING_LABELS.NEEDS_IMPROVEMENT;
    return BEHAVIOR_RATING_LABELS.UNSATISFACTORY;
  }

  static contributionToFinalGrade(
    behaviorScore: number,
    weight: number = BEHAVIOR_REPORT_WEIGHT
  ): number {
    return Math.round(behaviorScore * weight * 100) / 100;
  }

  static buildResult(
    ratings: BehaviorRatingCode[],
    weight: number = BEHAVIOR_REPORT_WEIGHT
  ): BehaviorScoreResult {
    const score = this.calculateScore(ratings);
    const totalAdjustment = ratings.reduce(
      (sum, rating) => sum + BEHAVIOR_RATING_ADJUSTMENTS[rating],
      0
    );
    return {
      score,
      level: this.levelForScore(score),
      ratingCount: ratings.length,
      totalAdjustment,
      contribution: this.contributionToFinalGrade(score, weight),
      weightPct: weight * 100,
    };
  }
}

/** @deprecated Use BehaviorCalculationService.calculateScore */
export function calculateBehaviorScore(ratings: BehaviorRatingCode[]): number {
  return BehaviorCalculationService.calculateScore(ratings);
}

/** @deprecated Use BehaviorCalculationService.levelForScore */
export function behaviorLevelForScore(score: number): string {
  return BehaviorCalculationService.levelForScore(score);
}
