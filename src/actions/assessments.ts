"use server";

import { revalidatePath } from "next/cache";
import { asAssessmentType, type AssessmentTypeCode } from "@/lib/setup-types";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit/create-audit-log";
import { assertClassroomAccess, assertEnrollmentsBelongToClassroom } from "@/lib/auth/enrollment-access";
import { assertCanPerformScopedWrite } from "@/lib/auth/scope-write";
import {
  assessmentScoreSchema,
  type AssessmentScoreInput,
} from "@/lib/validations/enrollment";
import {
  computeEnrollmentGradeMetrics,
  recomputeGradesForEnrollments,
} from "@/lib/grades/compute-enrollment-grade";
import { calculateFinalPercentage, letterGrade } from "@/lib/grades/calculate-final-grade";
import { BehaviorCalculationService } from "@/lib/behavior";
import { getGradingScale } from "@/lib/grades/get-grading-scale";
import { getSelectedAcademicYear, resolveAcademicYearForSchool } from "@/lib/academic-year/resolve-year";
import type { ScoreMatrixRow, TranscriptMatrixRow } from "@/lib/assessments/score-matrix-types";

export type { ScoreMatrixRow, TranscriptMatrixRow } from "@/lib/assessments/score-matrix-types";

async function getScoreMatrix(classroomId: string, academicYearId?: string) {
  const user = await requirePermission("assessments:read");
  if (!(await assertClassroomAccess(user, classroomId))) {
    throw new Error("Unauthorized classroom access");
  }

  const classroom = await prisma.classroom.findFirst({
    where: { id: classroomId, deletedAt: null },
    include: { school: true, grade: true, section: true },
  });
  if (!classroom) return null;

  let yearId = academicYearId;
  if (!yearId) {
    const selectedYear = await getSelectedAcademicYear(user);
    const schoolYear = await resolveAcademicYearForSchool(
      classroom.schoolId,
      selectedYear
    );
    yearId = schoolYear?.id;
  }
  if (!yearId) return { classroom, academicYear: null, rows: [] as ScoreMatrixRow[] };

  const [academicYear, enrollments] = await Promise.all([
    prisma.academicYear.findUnique({ where: { id: yearId } }),
    prisma.studentEnrollment.findMany({
      where: {
        classroomId,
        academicYearId: yearId,
        deletedAt: null,
        status: "ACTIVE",
      },
      include: {
        student: {
          select: { firstName: true, lastName: true, gender: true, studentNumber: true },
        },
        assessments: {
          where: { deletedAt: null },
          select: { type: true, score: true },
        },
      },
      orderBy: { student: { lastName: "asc" } },
    }),
  ]);

  const rows: ScoreMatrixRow[] = enrollments.map((e) => {
    const scoreMap: Partial<Record<AssessmentTypeCode, number>> = {};
    for (const a of e.assessments) {
      scoreMap[asAssessmentType(a.type)] = Number(a.score);
    }
    return {
      enrollmentId: e.id,
      studentName: `${e.student.firstName} ${e.student.lastName}`,
      studentNumber: e.student.studentNumber,
      gender: e.student.gender,
      scores: scoreMap,
    };
  });

  return { classroom, academicYear, rows };
}

export async function getAssessmentMatrix(classroomId: string, academicYearId?: string) {
  return getScoreMatrix(classroomId, academicYearId);
}

export async function getTranscriptMatrix(classroomId: string, academicYearId?: string) {
  const user = await requirePermission("assessments:read");
  if (!(await assertClassroomAccess(user, classroomId))) {
    throw new Error("Unauthorized classroom access");
  }

  const classroom = await prisma.classroom.findFirst({
    where: { id: classroomId, deletedAt: null },
    include: { school: true, grade: true, section: true },
  });
  if (!classroom) return null;

  let yearId = academicYearId;
  if (!yearId) {
    const selectedYear = await getSelectedAcademicYear(user);
    const schoolYear = await resolveAcademicYearForSchool(
      classroom.schoolId,
      selectedYear
    );
    yearId = schoolYear?.id;
  }
  if (!yearId) {
    return {
      classroom,
      academicYear: null,
      rows: [] as TranscriptMatrixRow[],
      gradingScale: await getGradingScale(),
    };
  }

  const [academicYear, gradingScale, enrollments] = await Promise.all([
    prisma.academicYear.findUnique({ where: { id: yearId } }),
    getGradingScale(),
    prisma.studentEnrollment.findMany({
      where: {
        classroomId,
        academicYearId: yearId,
        deletedAt: null,
        status: "ACTIVE",
      },
      include: {
        student: {
          select: { firstName: true, lastName: true, gender: true, studentNumber: true },
        },
        assessments: {
          where: { deletedAt: null },
          select: { type: true, score: true },
        },
        finalGrade: true,
      },
      orderBy: { student: { lastName: "asc" } },
    }),
  ]);

  const needsCompute = enrollments.filter((e) => !e.finalGrade);
  let calendarDays: Array<{ id: string; sessionType: string }> = [];
  const attendanceByEnrollment = new Map<
    string,
    Array<{
      calendarDayId: string;
      status: string;
      behaviorValue: string | null;
    }>
  >();

  if (needsCompute.length > 0) {
    const [days, attendanceRows] = await Promise.all([
      prisma.academicCalendarDay.findMany({
        where: { academicYearId: yearId, deletedAt: null },
        select: { id: true, sessionType: true },
      }),
      prisma.attendance.findMany({
        where: {
          enrollmentId: { in: needsCompute.map((e) => e.id) },
          deletedAt: null,
        },
        select: {
          enrollmentId: true,
          calendarDayId: true,
          status: true,
          behaviorValue: true,
        },
      }),
    ]);
    calendarDays = days;
    for (const row of attendanceRows) {
      const list = attendanceByEnrollment.get(row.enrollmentId) ?? [];
      list.push(row);
      attendanceByEnrollment.set(row.enrollmentId, list);
    }
  }

  const rows: TranscriptMatrixRow[] = enrollments.map((e) => {
    const scoreMap: Partial<Record<AssessmentTypeCode, number>> = {};
    for (const a of e.assessments) {
      scoreMap[asAssessmentType(a.type)] = Number(a.score);
    }

    let attendancePct: number;
    let behaviorPct: number;
    let classRank: number | null = e.finalGrade?.classRank ?? null;

    if (e.finalGrade) {
      attendancePct = Number(e.finalGrade.attendancePct);
      behaviorPct = Number(e.finalGrade.behaviorPct);
    } else {
      const metrics = computeEnrollmentGradeMetrics(
        {
          attendance: attendanceByEnrollment.get(e.id) ?? [],
          calendarDays,
          scores: scoreMap,
        },
        gradingScale
      );
      attendancePct = metrics.attendancePct;
      behaviorPct = metrics.behaviorPct;
    }

    const finalPct = calculateFinalPercentage(
      { attendancePct, behaviorPct, scores: scoreMap },
      gradingScale
    );

    const behaviorWeightPct = gradingScale.weights.behavior * 100;

    return {
      enrollmentId: e.id,
      studentName: `${e.student.firstName} ${e.student.lastName}`,
      studentNumber: e.student.studentNumber,
      gender: e.student.gender,
      scores: scoreMap,
      attendancePct,
      behaviorPct,
      behaviorLevel: BehaviorCalculationService.levelForScore(behaviorPct),
      behaviorContribution: BehaviorCalculationService.contributionToFinalGrade(
        behaviorPct,
        gradingScale.weights.behavior
      ),
      behaviorWeightPct,
      finalPct,
      letterGrade: letterGrade(finalPct, gradingScale),
      classRank,
    };
  });

  return { classroom, academicYear, rows, gradingScale };
}

export async function upsertAssessmentScore(data: AssessmentScoreInput) {
  const user = await requirePermission("assessments:update");
  const parsed = assessmentScoreSchema.parse(data);

  const enrollment = await prisma.studentEnrollment.findUnique({
    where: { id: parsed.enrollmentId },
  });
  if (!enrollment || enrollment.deletedAt) throw new Error("Enrollment not found");

  if (!(await assertClassroomAccess(user, enrollment.classroomId))) {
    throw new Error("Unauthorized");
  }

  const score = await prisma.assessmentScore.upsert({
    where: {
      enrollmentId_type: {
        enrollmentId: parsed.enrollmentId,
        type: parsed.type,
      },
    },
    create: {
      enrollmentId: parsed.enrollmentId,
      type: parsed.type,
      score: parsed.score,
      recordedById: user.id,
    },
    update: {
      score: parsed.score,
      recordedById: user.id,
    },
  });

  await recomputeGradesForEnrollments([parsed.enrollmentId]);

  await createAuditLog({
    userId: user.id,
    schoolId: enrollment.schoolId,
    entity: "AssessmentScore",
    entityId: score.id,
    action: "UPDATE",
    newValues: score as unknown as Prisma.InputJsonValue,
  });

  revalidateAssessmentPaths(enrollment.classroomId);
  return score;
}

function revalidateAssessmentPaths(classroomId: string) {
  revalidatePath("/assessments");
  revalidatePath(`/assessments/${classroomId}`);
  revalidatePath("/transcript");
  revalidatePath(`/transcript/${classroomId}`);
  revalidatePath("/teacher/assessments");
  revalidatePath(`/teacher/assessments/${classroomId}`);
  revalidatePath("/teacher/transcript");
  revalidatePath(`/teacher/transcript/${classroomId}`);
  revalidatePath("/dashboard/teacher");
}

export async function bulkUpsertAssessmentScores(
  classroomId: string,
  scores: AssessmentScoreInput[]
) {
  const user = await requirePermission("assessments:update");
  if (!(await assertClassroomAccess(user, classroomId))) {
    throw new Error("Unauthorized classroom access");
  }
  assertCanPerformScopedWrite(user);

  const parsedScores = scores.map((item) => assessmentScoreSchema.parse(item));
  const enrollmentIds = [...new Set(parsedScores.map((s) => s.enrollmentId))];
  await assertEnrollmentsBelongToClassroom(enrollmentIds, classroomId);

  for (const parsed of parsedScores) {
    await prisma.assessmentScore.upsert({
      where: {
        enrollmentId_type: {
          enrollmentId: parsed.enrollmentId,
          type: parsed.type,
        },
      },
      create: {
        enrollmentId: parsed.enrollmentId,
        type: parsed.type,
        score: parsed.score,
        recordedById: user.id,
      },
      update: {
        score: parsed.score,
        recordedById: user.id,
      },
    });
  }

  await recomputeGradesForEnrollments(enrollmentIds);

  await createAuditLog({
    userId: user.id,
    entity: "AssessmentScore",
    action: "UPDATE",
    newValues: { classroomId, count: scores.length },
  });

  revalidateAssessmentPaths(classroomId);
  return { success: true };
}

export async function getAcademicYearsForClassroom(classroomId: string) {
  const user = await requirePermission("assessments:read");
  if (!(await assertClassroomAccess(user, classroomId))) {
    throw new Error("Unauthorized");
  }

  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
  });
  if (!classroom) return [];

  return prisma.academicYear.findMany({
    where: { schoolId: classroom.schoolId, deletedAt: null },
    orderBy: { startDate: "desc" },
  });
}
