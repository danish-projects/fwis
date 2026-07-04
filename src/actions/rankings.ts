"use server";

import { asAssessmentType, type AssessmentTypeCode } from "@/lib/setup-types";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { mergeEnrollmentScope } from "@/lib/auth/section-scope";
import {
  getSelectedAcademicYear,
  resolveAcademicYearForSchool,
} from "@/lib/academic-year/resolve-year";
import { getSelectedSchool } from "@/lib/school/resolve-school";
import { computeEnrollmentGradeMetrics } from "@/lib/grades/compute-enrollment-grade";
import { loadGradingScale } from "@/lib/grades/get-grading-scale";
import {
  COMPLETION_PASS_PCT,
  RANK_CATEGORY_LABELS,
} from "@/lib/rankings/rank-categories";
import {
  buildRankDescriptionParts,
  rankCategoryTitle,
} from "@/lib/rankings/build-rank-description";
import {
  formatAcademicTerm,
  formatCertificateCampus,
  formatGraduationDate,
} from "@/lib/rankings/certificate-format";
import type {
  CertificateCategory,
  RankCertificateData,
  RankCertificateRequest,
} from "@/lib/rankings/certificate-types";

export type RankStudentRow = {
  enrollmentId: string;
  studentName: string;
  studentNumber: string | null;
  gradeName: string;
  gradeSortOrder: number;
  sectionName: string;
  classroomName: string;
  finalPct: number;
  attendancePct: number;
  letterGrade: string | null;
  rank: number;
};

export type AchievementGradeGroup = {
  gradeName: string;
  gradeSortOrder: number;
  students: RankStudentRow[];
};

export type AttendanceSectionWinner = {
  sectionName: string;
  student: RankStudentRow | null;
};

export type CompletionGradeGroup = {
  gradeName: string;
  gradeSortOrder: number;
  students: RankStudentRow[];
};

export type SchoolRankingsData = {
  schoolId: string;
  schoolName: string;
  academicYearName: string | null;
  achievement: AchievementGradeGroup[];
  attendance: AttendanceSectionWinner[];
  completion: CompletionGradeGroup[];
};

type ScoredStudent = Omit<RankStudentRow, "rank">;

function compareByScoreThenName(
  a: ScoredStudent,
  b: ScoredStudent,
  scoreKey: "finalPct" | "attendancePct"
) {
  const scoreDiff = b[scoreKey] - a[scoreKey];
  if (scoreDiff !== 0) return scoreDiff;
  return a.studentName.localeCompare(b.studentName);
}

function withRanks(students: ScoredStudent[]): RankStudentRow[] {
  return students.map((student, index) => ({
    ...student,
    rank: index + 1,
  }));
}

export async function getSchoolRankings(): Promise<SchoolRankingsData | null> {
  const user = await requirePermission("assessments:read");
  const selectedSchool = await getSelectedSchool(user);
  if (!selectedSchool) return null;

  const selectedYear = await getSelectedAcademicYear(user);
  const schoolYear = await resolveAcademicYearForSchool(
    selectedSchool.id,
    selectedYear
  );

  if (!schoolYear) {
    return {
      schoolId: selectedSchool.id,
      schoolName: selectedSchool.name,
      academicYearName: null,
      achievement: [],
      attendance: [],
      completion: [],
    };
  }

  const [gradingScale, enrollments] = await Promise.all([
    loadGradingScale(),
    prisma.studentEnrollment.findMany({
      where: mergeEnrollmentScope(user, {
        schoolId: selectedSchool.id,
        academicYearId: schoolYear.id,
        status: "ACTIVE",
        deletedAt: null,
      }),
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            studentNumber: true,
          },
        },
        classroom: {
          select: {
            name: true,
            grade: { select: { name: true, sortOrder: true } },
            section: { select: { name: true } },
          },
        },
        assessments: {
          where: { deletedAt: null },
          select: { type: true, score: true },
        },
        finalGrade: true,
      },
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
        where: { academicYearId: schoolYear.id, deletedAt: null },
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

  const scored: ScoredStudent[] = enrollments.map((enrollment) => {
    const scores: Partial<Record<AssessmentTypeCode, number>> = {};
    for (const assessment of enrollment.assessments) {
      scores[asAssessmentType(assessment.type)] = Number(assessment.score);
    }

    let finalPct: number;
    let attendancePct: number;
    let letterGrade: string | null;

    if (enrollment.finalGrade) {
      finalPct = Number(enrollment.finalGrade.finalPct);
      attendancePct = Number(enrollment.finalGrade.attendancePct);
      letterGrade = enrollment.finalGrade.letterGrade;
    } else {
      const metrics = computeEnrollmentGradeMetrics(
        {
          attendance: attendanceByEnrollment.get(enrollment.id) ?? [],
          calendarDays,
          scores,
        },
        gradingScale
      );
      finalPct = metrics.finalPct;
      attendancePct = metrics.attendancePct;
      letterGrade = metrics.letterGrade;
    }

    return {
      enrollmentId: enrollment.id,
      studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
      studentNumber: enrollment.student.studentNumber,
      gradeName: enrollment.classroom.grade.name,
      gradeSortOrder: enrollment.classroom.grade.sortOrder,
      sectionName: enrollment.classroom.section.name,
      classroomName: enrollment.classroom.name,
      finalPct,
      attendancePct,
      letterGrade,
    };
  });

  // Achievement: top 3 by final % within each grade
  const byGrade = new Map<string, ScoredStudent[]>();
  for (const student of scored) {
    const key = `${student.gradeSortOrder}:${student.gradeName}`;
    const list = byGrade.get(key) ?? [];
    list.push(student);
    byGrade.set(key, list);
  }

  const achievement: AchievementGradeGroup[] = [...byGrade.entries()]
    .map(([, students]) => {
      const sorted = [...students].sort((a, b) =>
        compareByScoreThenName(a, b, "finalPct")
      );
      const top = sorted.slice(0, 3);
      return {
        gradeName: top[0]?.gradeName ?? students[0].gradeName,
        gradeSortOrder: top[0]?.gradeSortOrder ?? students[0].gradeSortOrder,
        students: withRanks(top),
      };
    })
    .sort((a, b) => a.gradeSortOrder - b.gradeSortOrder);

  // Highest attendance: top 1 per section (Boys / Girls) school-wide
  const bySection = new Map<string, ScoredStudent[]>();
  for (const student of scored) {
    const list = bySection.get(student.sectionName) ?? [];
    list.push(student);
    bySection.set(student.sectionName, list);
  }

  const sectionOrder = ["Boys", "Girls"];
  const attendanceSections = [
    ...sectionOrder.filter((name) => bySection.has(name)),
    ...[...bySection.keys()]
      .filter((name) => !sectionOrder.includes(name))
      .sort(),
  ];

  const attendance: AttendanceSectionWinner[] = attendanceSections.map(
    (sectionName) => {
      const students = bySection.get(sectionName) ?? [];
      const sorted = [...students].sort((a, b) =>
        compareByScoreThenName(a, b, "attendancePct")
      );
      const winner = sorted[0];
      return {
        sectionName,
        student: winner
          ? { ...winner, rank: 1 }
          : null,
      };
    }
  );

  // Completion: final % >= 70, grouped by grade
  const completion: CompletionGradeGroup[] = [...byGrade.entries()]
    .map(([, students]) => {
      const passed = [...students]
        .filter((student) => student.finalPct >= COMPLETION_PASS_PCT)
        .sort((a, b) => compareByScoreThenName(a, b, "finalPct"));
      return {
        gradeName: students[0].gradeName,
        gradeSortOrder: students[0].gradeSortOrder,
        students: withRanks(passed),
      };
    })
    .filter((group) => group.students.length > 0)
    .sort((a, b) => a.gradeSortOrder - b.gradeSortOrder);

  return {
    schoolId: selectedSchool.id,
    schoolName: selectedSchool.name,
    academicYearName: schoolYear.name,
    achievement,
    attendance,
    completion,
  };
}

function findRankedStudent(
  data: SchoolRankingsData,
  enrollmentId: string,
  category: CertificateCategory
): RankStudentRow | null {
  if (category === "achievement") {
    for (const group of data.achievement) {
      const match = group.students.find((s) => s.enrollmentId === enrollmentId);
      if (match) return match;
    }
  }
  if (category === "attendance") {
    for (const entry of data.attendance) {
      if (entry.student?.enrollmentId === enrollmentId) return entry.student;
    }
  }
  if (category === "completion") {
    for (const group of data.completion) {
      const match = group.students.find((s) => s.enrollmentId === enrollmentId);
      if (match) return match;
    }
  }
  return null;
}

function buildRankCertificateData(
  student: RankStudentRow,
  category: CertificateCategory,
  school: { name: string; city: string; state: string },
  academicYearName: string,
  academicTerm: string,
  graduationDate: string
): RankCertificateData {
  const valueKind = category === "attendance" ? "attendance" : "final";
  const valuePct =
    category === "attendance" ? student.attendancePct : student.finalPct;

  return {
    category,
    categoryLabel: RANK_CATEGORY_LABELS[category],
    rankCategoryTitle: rankCategoryTitle(category),
    rankDescription: buildRankDescriptionParts({
      category,
      schoolName: school.name,
      gradeName: student.gradeName,
      sectionName: student.sectionName,
      rank: student.rank,
      academicTerm,
    }),
    studentName: student.studentName,
    studentNumber: student.studentNumber,
    gradeName: student.gradeName,
    sectionName: student.sectionName,
    gradeWithSection: `${student.gradeName} ${student.sectionName}`,
    rank: student.rank,
    valuePct,
    valueKind,
    valueLabel:
      valueKind === "attendance" ? "Attendance (Present %)" : "Final Score",
    schoolName: school.name,
    campusLabel: formatCertificateCampus(school.city, school.state),
    academicYearName,
    academicTerm,
    graduationDate,
  };
}

async function loadRankCertificateContext() {
  const user = await requirePermission("assessments:read");
  const selectedSchool = await getSelectedSchool(user);
  if (!selectedSchool) return null;

  const selectedYear = await getSelectedAcademicYear(user);
  const schoolYear = await resolveAcademicYearForSchool(
    selectedSchool.id,
    selectedYear
  );
  if (!schoolYear) return null;

  const data = await getSchoolRankings();
  if (!data?.academicYearName) return null;

  const [school, graduationDay] = await Promise.all([
    prisma.school.findFirst({
      where: { id: selectedSchool.id, deletedAt: null },
      select: { name: true, city: true, state: true },
    }),
    prisma.academicCalendarDay.findFirst({
      where: {
        academicYearId: schoolYear.id,
        sessionType: "GRADUATION",
        deletedAt: null,
      },
      orderBy: { date: "asc" },
      select: { date: true },
    }),
  ]);

  if (!school) return null;

  const academicTerm = formatAcademicTerm(
    schoolYear.startDate,
    schoolYear.endDate
  );
  const graduationDate = graduationDay
    ? formatGraduationDate(graduationDay.date)
    : "—";

  return { data, school, academicYearName: data.academicYearName, academicTerm, graduationDate };
}

export async function getRankCertificatesBulk(
  requests: RankCertificateRequest[]
): Promise<RankCertificateData[]> {
  if (requests.length === 0) return [];

  const context = await loadRankCertificateContext();
  if (!context) return [];

  const { data, school, academicYearName, academicTerm, graduationDate } =
    context;

  const certificates: RankCertificateData[] = [];
  for (const request of requests) {
    const student = findRankedStudent(
      data,
      request.enrollmentId,
      request.category
    );
    if (!student) continue;
    certificates.push(
      buildRankCertificateData(
        student,
        request.category,
        school,
        academicYearName,
        academicTerm,
        graduationDate
      )
    );
  }

  return certificates;
}

export async function getRankCertificate(
  enrollmentId: string,
  category: CertificateCategory
): Promise<RankCertificateData | null> {
  const context = await loadRankCertificateContext();
  if (!context) return null;

  const student = findRankedStudent(context.data, enrollmentId, category);
  if (!student) return null;

  return buildRankCertificateData(
    student,
    category,
    context.school,
    context.academicYearName,
    context.academicTerm,
    context.graduationDate
  );
}
