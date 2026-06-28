import { asAssessmentType, type AssessmentType } from "@/lib/setup-types";
import { prisma } from "@/lib/prisma";
import { BehaviorCalculationService } from "@/lib/behavior";
import {
  calculateAttendancePercentage,
  countsAsPresent,
  isCountableAttendanceDay,
} from "@/lib/grades/attendance-percentage";
import {
  calculateFinalPercentage,
  letterGrade,
  passFail,
} from "@/lib/grades/calculate-final-grade";
import type { GradingScaleConfig } from "@/lib/grades/grading-scale-types";
import { loadGradingScale } from "@/lib/grades/get-grading-scale";

export function computeEnrollmentGradeMetrics(
  input: {
    attendance: Array<{
      calendarDayId: string;
      status: string;
      behaviorValue?: string | null;
    }>;
    calendarDays: Array<{ id: string; sessionType: string }>;
    scores: Partial<Record<AssessmentType, number>>;
  },
  scale: GradingScaleConfig
) {
  const countableDays = input.calendarDays.filter(
    (d) => isCountableAttendanceDay(d.sessionType)
  );
  const countableDayIds = new Set(countableDays.map((d) => d.id));

  const relevantAttendance = input.attendance.filter((a) =>
    countableDayIds.has(a.calendarDayId)
  );

  const presentOrTardy = relevantAttendance.filter((a) =>
    countsAsPresent(a.status)
  ).length;

  const attendancePct = calculateAttendancePercentage({
    totalCountableDays: countableDays.length,
    presentOrTardyDays: presentOrTardy,
  });

  const behaviorRatings = input.attendance
    .map((a) => a.behaviorValue)
    .filter((value): value is string => Boolean(value));

  const behaviorPct = BehaviorCalculationService.calculateFromRaw(behaviorRatings);

  const finalPct = calculateFinalPercentage(
    {
      attendancePct,
      behaviorPct,
      scores: input.scores,
    },
    scale
  );

  return {
    attendancePct,
    behaviorPct,
    finalPct,
    letterGrade: letterGrade(finalPct, scale),
    passFail: passFail(finalPct, scale),
  };
}

async function computeMetricsForEnrollment(enrollmentId: string) {
  const [enrollment, scale] = await Promise.all([
    prisma.studentEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        attendance: {
          where: { deletedAt: null },
          select: {
            calendarDayId: true,
            status: true,
            behaviorValue: true,
          },
        },
        assessments: {
          where: { deletedAt: null },
          select: { type: true, score: true },
        },
        academicYear: {
          include: {
            calendarDays: {
              where: { deletedAt: null },
              select: { id: true, sessionType: true },
            },
          },
        },
      },
    }),
    loadGradingScale(),
  ]);

  if (!enrollment) return null;

  const scores: Partial<Record<AssessmentType, number>> = {};
  for (const a of enrollment.assessments) {
    scores[a.type as AssessmentType] = Number(a.score);
  }

  const metrics = computeEnrollmentGradeMetrics(
    {
      attendance: enrollment.attendance,
      calendarDays: enrollment.academicYear.calendarDays,
      scores,
    },
    scale
  );

  return {
    enrollmentId,
    classroomId: enrollment.classroomId,
    academicYearId: enrollment.academicYearId,
    ...metrics,
  };
}

export async function computeAndSaveEnrollmentGrade(
  enrollmentId: string,
  options?: { skipRankRecompute?: boolean }
) {
  const metrics = await computeMetricsForEnrollment(enrollmentId);
  if (!metrics) return null;

  await prisma.enrollmentFinalGrade.upsert({
    where: { enrollmentId },
    create: {
      enrollmentId,
      attendancePct: metrics.attendancePct,
      behaviorPct: metrics.behaviorPct,
      finalPct: metrics.finalPct,
      letterGrade: metrics.letterGrade,
      passFail: metrics.passFail,
    },
    update: {
      attendancePct: metrics.attendancePct,
      behaviorPct: metrics.behaviorPct,
      finalPct: metrics.finalPct,
      letterGrade: metrics.letterGrade,
      passFail: metrics.passFail,
      computedAt: new Date(),
    },
  });

  if (!options?.skipRankRecompute) {
    await recomputeClassroomRanks(metrics.classroomId, metrics.academicYearId);
  }

  return metrics;
}

/** Re-rank from stored final grades only — no full metric recompute. */
export async function recomputeClassroomRanks(
  classroomId: string,
  academicYearId: string
) {
  const grades = await prisma.enrollmentFinalGrade.findMany({
    where: {
      enrollment: {
        classroomId,
        academicYearId,
        deletedAt: null,
        status: "ACTIVE",
      },
    },
    select: { enrollmentId: true, finalPct: true },
  });

  if (grades.length === 0) return;

  const ranked = [...grades].sort(
    (a, b) => Number(b.finalPct) - Number(a.finalPct)
  );

  await prisma.$transaction(
    ranked.map((grade, index) =>
      prisma.enrollmentFinalGrade.update({
        where: { enrollmentId: grade.enrollmentId },
        data: { classRank: index + 1 },
      })
    )
  );
}

export async function recomputeGradesForEnrollments(enrollmentIds: string[]) {
  if (enrollmentIds.length === 0) return;

  const uniqueIds = [...new Set(enrollmentIds)];
  const classroomKeys = new Set<string>();

  await Promise.all(
    uniqueIds.map(async (enrollmentId) => {
      const metrics = await computeAndSaveEnrollmentGrade(enrollmentId, {
        skipRankRecompute: true,
      });
      if (metrics) {
        classroomKeys.add(`${metrics.classroomId}:${metrics.academicYearId}`);
      }
    })
  );

  await Promise.all(
    [...classroomKeys].map((key) => {
      const [classroomId, academicYearId] = key.split(":");
      return recomputeClassroomRanks(classroomId, academicYearId);
    })
  );
}
