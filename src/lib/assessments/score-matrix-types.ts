import type { AssessmentTypeCode } from "@/lib/setup-types";

export type ScoreMatrixRow = {
  enrollmentId: string;
  studentName: string;
  studentNumber: string | null;
  gender: string;
  scores: Partial<Record<AssessmentTypeCode, number>>;
};

export type TranscriptMatrixRow = ScoreMatrixRow & {
  attendancePct: number;
  behaviorPct: number;
  behaviorLevel: string;
  behaviorContribution: number;
  behaviorWeightPct: number;
  finalPct: number;
  letterGrade: string;
  classRank: number | null;
};
