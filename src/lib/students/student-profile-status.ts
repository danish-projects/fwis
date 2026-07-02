import {
  BEHAVIOR_RATING_ADJUSTMENTS,
  BEHAVIOR_RATING_LABELS,
} from "@/lib/behavior/behavior-calculation-service";
import type { BehaviorRatingCode } from "../../../prisma/lookup-data";

export type StudentProfileHealthStatus = "green" | "orange" | "red";

export type StudentProfileHealth = {
  status: StudentProfileHealthStatus;
  title: string;
  description: string;
  concerns: string[];
  strengths: string[];
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function computeStudentProfileHealth(input: {
  attendancePct: number;
  absentCount: number;
  tardyCount: number;
  behaviorScore: number;
  quizScores: number[];
  finalExamScore: number | null;
  overallFinalPct: number | null;
}): StudentProfileHealth {
  const concerns: string[] = [];
  const strengths: string[] = [];
  let riskScore = 0;

  if (input.attendancePct < 75) {
    riskScore += 2;
    concerns.push(
      `Attendance is critically low at ${input.attendancePct.toFixed(1)}%.`
    );
  } else if (input.attendancePct < 90) {
    riskScore += 1;
    concerns.push(
      `Attendance is below target at ${input.attendancePct.toFixed(1)}%.`
    );
  } else {
    strengths.push(`Strong attendance at ${input.attendancePct.toFixed(1)}%.`);
  }

  if (input.absentCount >= 5) {
    riskScore += 2;
    concerns.push(`${input.absentCount} absences recorded this year.`);
  } else if (input.absentCount >= 3) {
    riskScore += 1;
    concerns.push(`${input.absentCount} absences — monitor closely.`);
  } else if (input.absentCount === 0) {
    strengths.push("No absences on instructional days.");
  }

  if (input.tardyCount >= 5) {
    riskScore += 1;
    concerns.push(`${input.tardyCount} tardy marks affecting punctuality.`);
  } else if (input.tardyCount >= 3) {
    concerns.push(`${input.tardyCount} tardy marks this year.`);
  }

  if (input.behaviorScore < 75) {
    riskScore += 2;
    concerns.push(
      `Behavior score is low at ${input.behaviorScore.toFixed(1)}%.`
    );
  } else if (input.behaviorScore < 85) {
    riskScore += 1;
    concerns.push(
      `Behavior score (${input.behaviorScore.toFixed(1)}%) needs improvement.`
    );
  } else {
    strengths.push(
      `Good classroom behavior (${input.behaviorScore.toFixed(1)}%).`
    );
  }

  const quizAvg = average(input.quizScores);
  if (quizAvg !== null) {
    if (quizAvg < 65) {
      riskScore += 2;
      concerns.push(`Quiz average is failing at ${quizAvg.toFixed(1)}%.`);
    } else if (quizAvg < 75) {
      riskScore += 1;
      concerns.push(`Quiz average (${quizAvg.toFixed(1)}%) is below target.`);
    } else if (quizAvg >= 85) {
      strengths.push(`Solid quiz performance (${quizAvg.toFixed(1)}% average).`);
    }
  }

  if (input.finalExamScore !== null) {
    if (input.finalExamScore < 65) {
      riskScore += 2;
      concerns.push(
        `Final exam score is failing at ${input.finalExamScore.toFixed(1)}%.`
      );
    } else if (input.finalExamScore < 75) {
      riskScore += 1;
      concerns.push(
        `Final exam score (${input.finalExamScore.toFixed(1)}%) needs support.`
      );
    } else if (input.finalExamScore >= 85) {
      strengths.push(
        `Strong final exam result (${input.finalExamScore.toFixed(1)}%).`
      );
    }
  }

  if (input.overallFinalPct !== null) {
    if (input.overallFinalPct < 70) {
      riskScore += 2;
    } else if (input.overallFinalPct >= 85) {
      strengths.push(
        `Overall grade is excellent at ${input.overallFinalPct.toFixed(1)}%.`
      );
    }
  }

  let status: StudentProfileHealthStatus = "green";
  let title = "On Track";

  if (
    riskScore >= 4 ||
    concerns.some((c) => c.includes("critically") || c.includes("failing"))
  ) {
    status = "red";
    title = "Needs Immediate Attention";
  } else if (riskScore >= 2 || concerns.length >= 2) {
    status = "orange";
    title = "Monitor & Support";
  }

  const description =
    status === "green"
      ? strengths.length > 0
        ? `${strengths.slice(0, 2).join(" ")} Continue encouraging consistent effort across attendance, behavior, and assessments.`
        : "Performance is stable across attendance, behavior, and academics. No major concerns at this time."
      : status === "orange"
        ? `${concerns.slice(0, 3).join(" ")} ${strengths.length > 0 ? strengths[0] : "Targeted support in weak areas is recommended."}`
        : `${concerns.slice(0, 4).join(" ")} Schedule a parent conference and an academic support plan as soon as possible.`;

  return { status, title, description, concerns, strengths };
}

export function buildBehaviorRatingRows(
  counts: Partial<Record<BehaviorRatingCode, number>>
) {
  return (Object.keys(BEHAVIOR_RATING_LABELS) as BehaviorRatingCode[]).map(
    (code) => ({
      code,
      label: BEHAVIOR_RATING_LABELS[code],
      count: counts[code] ?? 0,
      adjustment:
        BEHAVIOR_RATING_ADJUSTMENTS[code] > 0
          ? `+${BEHAVIOR_RATING_ADJUSTMENTS[code]}`
          : String(BEHAVIOR_RATING_ADJUSTMENTS[code]),
    })
  );
}
