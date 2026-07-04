export const RANK_CATEGORIES = [
  "all",
  "achievement",
  "attendance",
  "completion",
] as const;

export type RankCategory = (typeof RANK_CATEGORIES)[number];

export const RANK_CATEGORY_LABELS: Record<RankCategory, string> = {
  all: "All",
  achievement: "Achievement Rank",
  attendance: "Highest Attendance Rank",
  completion: "Completion",
};

/** Final score threshold for Completion (passed students). */
export const COMPLETION_PASS_PCT = 70;
