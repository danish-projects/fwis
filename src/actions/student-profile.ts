"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission, type AuthUser } from "@/lib/auth/session";
import { assertStudentAccess } from "@/lib/auth/student-access";
import { mergeEnrollmentScope } from "@/lib/auth/section-scope";
import { getSelectedAcademicYear } from "@/lib/academic-year/resolve-year";
import { BehaviorCalculationService } from "@/lib/behavior";
import { isCountableAttendanceDay } from "@/lib/grades/attendance-percentage";
import { computeEnrollmentGradeMetrics } from "@/lib/grades/compute-enrollment-grade";
import { loadGradingScale } from "@/lib/grades/get-grading-scale";
import { asAssessmentType, type AssessmentType } from "@/lib/setup-types";
import {
  ASSESSMENT_TYPE_LABELS,
  QUIZ_TYPES,
} from "@/lib/validations/enrollment";
import { decryptStudentPii } from "@/lib/students/student-pii";
import {
  buildBehaviorRatingRows,
  computeStudentProfileHealth,
  type StudentProfileHealth,
} from "@/lib/students/student-profile-status";
import type { BehaviorRatingCode } from "../../prisma/lookup-data";

export type StudentProfileYearOption = {
  academicYearId: string;
  name: string;
  enrollmentId: string;
};

export type StudentProfileData = {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    gender: string;
    studentNumber: string | null;
    dateOfBirth: Date | null;
    enrollmentDate: Date;
    emailAddress: string | null;
    emergencyContact: string | null;
    streetAddress: string | null;
    city: string | null;
    stateProvince: string | null;
    zipPostalCode: string | null;
    country: string | null;
    fatherGuardianFirstName: string | null;
    fatherGuardianLastName: string | null;
    fatherParentalResponsibility: boolean | null;
    fatherMobileWhatsappNumber: string | null;
    motherGuardianFirstName: string | null;
    motherGuardianLastName: string | null;
    motherParentalResponsibility: boolean | null;
    motherMobileWhatsappNumber: string | null;
    isActive: boolean;
  };
  yearOptions: StudentProfileYearOption[];
  selectedYearId: string | null;
  enrollment: {
    id: string;
    status: string;
    enrollmentDate: Date;
    schoolName: string;
    gradeName: string;
    staffName: string | null;
    academicYearName: string;
  } | null;
  attendance: {
    present: number;
    absent: number;
    tardy: number;
    totalDays: number;
    presentPct: number;
    absentPct: number;
    tardyPct: number;
    attendancePct: number;
  };
  assessments: Array<{
    type: AssessmentType;
    label: string;
    score: number | null;
  }>;
  behavior: {
    rows: Array<{
      code: BehaviorRatingCode;
      label: string;
      count: number;
      adjustment: string;
    }>;
    ratingCount: number;
    totalAdjustment: number;
    score: number;
    level: string;
    contribution: number;
  };
  overall: {
    finalPct: number | null;
    letterGrade: string | null;
    classRank: number | null;
  };
  health: StudentProfileHealth;
};

function mapStudentProfileFields(student: {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  studentNumber: string | null;
  dateOfBirth: Date | null;
  enrollmentDate: Date;
  emailAddress?: string | null;
  emergencyContact: string | null;
  streetAddress?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  zipPostalCode?: string | null;
  country?: string | null;
  fatherGuardianFirstName?: string | null;
  fatherGuardianLastName?: string | null;
  fatherParentalResponsibility?: boolean | null;
  fatherMobileWhatsappNumber?: string | null;
  motherGuardianFirstName?: string | null;
  motherGuardianLastName?: string | null;
  motherParentalResponsibility?: boolean | null;
  motherMobileWhatsappNumber?: string | null;
  isActive: boolean;
}): StudentProfileData["student"] {
  return {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    gender: student.gender,
    studentNumber: student.studentNumber,
    dateOfBirth: student.dateOfBirth,
    enrollmentDate: student.enrollmentDate,
    emailAddress: student.emailAddress ?? null,
    emergencyContact: student.emergencyContact,
    streetAddress: student.streetAddress ?? null,
    city: student.city ?? null,
    stateProvince: student.stateProvince ?? null,
    zipPostalCode: student.zipPostalCode ?? null,
    country: student.country ?? null,
    fatherGuardianFirstName: student.fatherGuardianFirstName ?? null,
    fatherGuardianLastName: student.fatherGuardianLastName ?? null,
    fatherParentalResponsibility: student.fatherParentalResponsibility ?? null,
    fatherMobileWhatsappNumber: student.fatherMobileWhatsappNumber ?? null,
    motherGuardianFirstName: student.motherGuardianFirstName ?? null,
    motherGuardianLastName: student.motherGuardianLastName ?? null,
    motherParentalResponsibility: student.motherParentalResponsibility ?? null,
    motherMobileWhatsappNumber: student.motherMobileWhatsappNumber ?? null,
    isActive: student.isActive,
  };
}

async function pickEnrollment(
  user: AuthUser,
  studentId: string,
  requestedYearId?: string | null
) {
  const scope = mergeEnrollmentScope(user, {});
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      studentId,
      deletedAt: null,
      ...scope,
    },
    include: {
      school: { select: { name: true } },
      academicYearSchool: { include: { academicYear: { select: { id: true, name: true } } } },
      classroom: { select: { name: true, grade: { select: { name: true } } } },
      staff: { select: { firstName: true, lastName: true } },
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
      finalGrade: true,
    },
    orderBy: [{ enrollmentDate: "desc" }],
  });

  if (enrollments.length === 0) return null;

  if (requestedYearId) {
    const direct = enrollments.find(
      (e) => e.academicYearSchool.academicYear.id === requestedYearId
    );
    if (direct) return direct;

    const requestedYear = await prisma.academicYear.findFirst({
      where: { id: requestedYearId, deletedAt: null },
      select: { name: true },
    });
    if (requestedYear) {
      const byName = enrollments.find(
        (e) => e.academicYearSchool.academicYear.name === requestedYear.name
      );
      if (byName) return byName;
    }
  }

  const selected = await getSelectedAcademicYear(user);
  if (selected) {
    const bySelected = enrollments.find(
      (e) => e.academicYearSchool.academicYear.name === selected.name
    );
    if (bySelected) return bySelected;
  }

  const active = enrollments.find((e) => e.status === "ACTIVE");
  return active ?? enrollments[0];
}

export async function getStudentProfile(
  studentId: string,
  requestedYearId?: string | null
): Promise<StudentProfileData | null> {
  const user = await requirePermission("students:read");
  if (!(await assertStudentAccess(user, studentId))) {
    throw new Error("Unauthorized access to student");
  }

  const studentRecord = await prisma.student.findFirst({
    where: { id: studentId, deletedAt: null },
  });
  if (!studentRecord) return null;

  const student = decryptStudentPii(studentRecord);

  const scope = mergeEnrollmentScope(user, {});
  const allEnrollments = await prisma.studentEnrollment.findMany({
    where: { studentId, deletedAt: null, ...scope },
    select: {
      id: true,
      academicYearSchoolId: true,
      academicYearSchool: { select: { academicYear: { select: { id: true, name: true } } } },
    },
    orderBy: { enrollmentDate: "desc" },
  });

  const yearOptions: StudentProfileYearOption[] = [];
  const seenYears = new Set<string>();
  for (const e of allEnrollments) {
    if (seenYears.has(e.academicYearSchool.academicYear.name)) continue;
    seenYears.add(e.academicYearSchool.academicYear.name);
    yearOptions.push({
      academicYearId: e.academicYearSchool.academicYear.id,
      name: e.academicYearSchool.academicYear.name,
      enrollmentId: e.id,
    });
  }

  const enrollment = await pickEnrollment(user, studentId, requestedYearId);

  if (!enrollment) {
    return {
      student: mapStudentProfileFields(student),
      yearOptions,
      selectedYearId: requestedYearId ?? null,
      enrollment: null,
      attendance: {
        present: 0,
        absent: 0,
        tardy: 0,
        totalDays: 0,
        presentPct: 0,
        absentPct: 0,
        tardyPct: 0,
        attendancePct: 100,
      },
      assessments: [
        ...QUIZ_TYPES.map((type) => ({
          type: type as AssessmentType,
          label: ASSESSMENT_TYPE_LABELS[type],
          score: null as number | null,
        })),
        {
          type: "FINAL_EXAM" as AssessmentType,
          label: ASSESSMENT_TYPE_LABELS.FINAL_EXAM,
          score: null,
        },
      ],
      behavior: {
        rows: buildBehaviorRatingRows({}),
        ratingCount: 0,
        totalAdjustment: 0,
        score: BehaviorCalculationService.calculateScore([]),
        level: BehaviorCalculationService.levelForScore(
          BehaviorCalculationService.calculateScore([])
        ),
        contribution: BehaviorCalculationService.contributionToFinalGrade(
          BehaviorCalculationService.calculateScore([])
        ),
      },
      overall: { finalPct: null, letterGrade: null, classRank: null },
      health: computeStudentProfileHealth({
        attendancePct: 100,
        absentCount: 0,
        tardyCount: 0,
        behaviorScore: BehaviorCalculationService.calculateScore([]),
        quizScores: [],
        finalExamScore: null,
        overallFinalPct: null,
      }),
    };
  }

  const [calendarDays, scale] = await Promise.all([
    prisma.academicCalendarDay.findMany({
      where: {
        academicYearSchoolId: enrollment.academicYearSchoolId,
        deletedAt: null,
      },
      select: { id: true, sessionType: true },
    }),
    loadGradingScale(),
  ]);

  const countableDayIds = new Set(
    calendarDays
      .filter((d) => isCountableAttendanceDay(d.sessionType))
      .map((d) => d.id)
  );

  const relevantAttendance = enrollment.attendance.filter((a) =>
    countableDayIds.has(a.calendarDayId)
  );

  const present = relevantAttendance.filter((a) => a.status === "PRESENT").length;
  const absent = relevantAttendance.filter((a) => a.status === "ABSENT").length;
  const tardy = relevantAttendance.filter((a) => a.status === "TARDY").length;
  const totalDays = countableDayIds.size;

  const pct = (count: number) =>
    totalDays > 0 ? Math.round((count / totalDays) * 10000) / 100 : 0;

  const scores: Partial<Record<AssessmentType, number>> = {};
  for (const a of enrollment.assessments) {
    scores[asAssessmentType(a.type)] = Number(a.score);
  }

  const metrics = computeEnrollmentGradeMetrics(
    {
      attendance: enrollment.attendance,
      calendarDays,
      scores,
    },
    scale
  );

  const behaviorRatings = enrollment.attendance
    .map((a) => a.behaviorValue)
    .filter((value): value is BehaviorRatingCode => Boolean(value));

  const behaviorCounts: Partial<Record<BehaviorRatingCode, number>> = {};
  for (const rating of behaviorRatings) {
    behaviorCounts[rating] = (behaviorCounts[rating] ?? 0) + 1;
  }

  const behaviorResult = BehaviorCalculationService.buildResult(behaviorRatings);

  const quizScores = QUIZ_TYPES.map((type) => scores[type]).filter(
    (score): score is number => score !== undefined
  );

  const finalExamScore = scores.FINAL_EXAM ?? null;
  const overallFinalPct =
    enrollment.finalGrade?.finalPct != null
      ? Number(enrollment.finalGrade.finalPct)
      : metrics.finalPct;

  const assessments = [
    ...QUIZ_TYPES.map((type) => ({
      type,
      label: ASSESSMENT_TYPE_LABELS[type],
      score: scores[type] ?? null,
    })),
    {
      type: "FINAL_EXAM" as AssessmentType,
      label: ASSESSMENT_TYPE_LABELS.FINAL_EXAM,
      score: finalExamScore,
    },
  ];

  return {
    student: mapStudentProfileFields(student),
    yearOptions,
    selectedYearId: enrollment.academicYearSchool.academicYear.id,
    enrollment: {
      id: enrollment.id,
      status: enrollment.status,
      enrollmentDate: enrollment.enrollmentDate,
      schoolName: enrollment.school.name,
      gradeName: enrollment.classroom.name,
      staffName: enrollment.staff
        ? `${enrollment.staff.firstName} ${enrollment.staff.lastName}`
        : null,
      academicYearName: enrollment.academicYearSchool.academicYear.name,
    },
    attendance: {
      present,
      absent,
      tardy,
      totalDays,
      presentPct: pct(present),
      absentPct: pct(absent),
      tardyPct: pct(tardy),
      attendancePct: metrics.attendancePct,
    },
    assessments,
    behavior: {
      rows: buildBehaviorRatingRows(behaviorCounts),
      ratingCount: behaviorResult.ratingCount,
      totalAdjustment: behaviorResult.totalAdjustment,
      score: behaviorResult.score,
      level: behaviorResult.level,
      contribution: behaviorResult.contribution,
    },
    overall: {
      finalPct: overallFinalPct,
      letterGrade:
        enrollment.finalGrade?.letterGrade ?? metrics.letterGrade ?? null,
      classRank: enrollment.finalGrade?.classRank ?? null,
    },
    health: computeStudentProfileHealth({
      attendancePct: metrics.attendancePct,
      absentCount: absent,
      tardyCount: tardy,
      behaviorScore: behaviorResult.score,
      quizScores,
      finalExamScore,
      overallFinalPct,
    }),
  };
}
