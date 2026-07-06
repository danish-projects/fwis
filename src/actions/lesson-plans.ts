"use server";

import { prisma } from "@/lib/prisma";
import {
  getSelectedAcademicYear,
  resolveAcademicYearForSchool,
} from "@/lib/academic-year/resolve-year";
import { getSessionUser, requirePermission } from "@/lib/auth/session";
import type { AuthUser } from "@/lib/auth/session";
import { getTeacherClassrooms } from "@/lib/auth/teacher-defaults";
import {
  findLessonPlanDriveFile,
  isLessonPlanDriveReady,
} from "@/lib/google-drive/lesson-plans";
import { assertLessonPlanGradeAccess } from "@/lib/lesson-plans/access";
import {
  buildMissingLessonPlanReasons,
  isLessonPlanInstructionDay,
  lessonPlanSessionTypeLabel,
} from "@/lib/lesson-plans/instruction-day";
import {
  buildLessonPlanWeekOptions,
  selectCurrentLessonPlanWeek,
  type LessonPlanWeekOption,
} from "@/lib/lesson-plans/week-options";
import { getSelectedSchool } from "@/lib/school/resolve-school";
import { resolveGradeIdFromParam } from "@/lib/lesson-plans/page-params";

export type LessonPlanGradeOption = {
  id: number;
  name: string;
};

export type LessonPlanDocumentRow = {
  fileId: string;
  fileName: string;
  gradeId: number;
  gradeName: string;
  lessonPlanNumber: number;
  weekDate: string;
};

export type LessonPlanPageData = {
  schoolId: string;
  schoolName: string;
  academicYearName: string | null;
  driveConfigured: boolean;
  docsDriveFolderId: string | null;
  grades: LessonPlanGradeOption[];
  weeks: LessonPlanWeekOption[];
  selectedGradeId: number | null;
  selectedLessonPlanNumber: number | null;
  selectedDay: {
    lessonPlanNumber: number;
    date: string;
    sessionType: string;
    sessionTypeLabel: string;
    isInstructional: boolean;
  } | null;
  documents: LessonPlanDocumentRow[];
  driveError: string | null;
  missingReasons: string[];
};

type DocsDriveFolderContext = {
  academicYearId: string;
  academicYearName: string;
  docsDriveFolderId: string | null;
};

async function resolveDocsDriveFolderForSchool(
  user: AuthUser,
  schoolId: string
): Promise<DocsDriveFolderContext | null> {
  const selectedYear = await getSelectedAcademicYear(user);
  const schoolYear = await resolveAcademicYearForSchool(schoolId, selectedYear);
  if (!schoolYear) return null;

  return {
    academicYearId: schoolYear.academicYearId,
    academicYearName: schoolYear.academicYear.name,
    docsDriveFolderId: schoolYear.academicYear.docsDriveFolderId?.trim() || null,
  };
}

async function listGradesForLessonPlans(
  user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>,
  schoolId: string
): Promise<LessonPlanGradeOption[]> {
  if (user.roles.includes("TEACHER")) {
    const teacherClassrooms = await getTeacherClassrooms(user);
    const gradeMap = new Map<
      number,
      LessonPlanGradeOption & { sortOrder: number }
    >();

    for (const classroom of teacherClassrooms) {
      if (classroom.schoolId !== schoolId) continue;
      gradeMap.set(classroom.gradeId, {
        id: classroom.gradeId,
        name: classroom.grade.name,
        sortOrder: classroom.grade.sortOrder,
      });
    }

    return [...gradeMap.values()]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map(({ id, name }) => ({ id, name }));
  }

  const classrooms = await prisma.classroom.findMany({
    where: { schoolId, deletedAt: null, isActive: true },
    orderBy: [{ grade: { sortOrder: "asc" } }, { section: { name: "asc" } }],
    select: {
      grade: { select: { id: true, name: true, sortOrder: true } },
    },
  });

  const gradeMap = new Map<number, LessonPlanGradeOption & { sortOrder: number }>();
  for (const classroom of classrooms) {
    gradeMap.set(classroom.grade.id, {
      id: classroom.grade.id,
      name: classroom.grade.name,
      sortOrder: classroom.grade.sortOrder,
    });
  }

  return [...gradeMap.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map(({ id, name }) => ({ id, name }));
}

export async function getLessonPlanPageData(params?: {
  gradeId?: number;
  gradeParam?: string;
  lessonPlanNumber?: number;
}): Promise<LessonPlanPageData | null> {
  const user = await requirePermission("lesson-plans:read");
  const selectedSchool = await getSelectedSchool(user);
  if (!selectedSchool) return null;

  const school = await prisma.school.findFirst({
    where: { id: selectedSchool.id, deletedAt: null },
    select: {
      id: true,
      name: true,
    },
  });
  if (!school) return null;

  const docsFolder = await resolveDocsDriveFolderForSchool(user, school.id);
  const selectedYear = await getSelectedAcademicYear(user);
  const academicYear = await resolveAcademicYearForSchool(
    school.id,
    selectedYear
  );

  const grades = await listGradesForLessonPlans(user, school.id);
  const resolvedGradeId =
    params?.gradeId ??
    resolveGradeIdFromParam(grades, params?.gradeParam);

  const calendarDays = academicYear
    ? await prisma.academicCalendarDay.findMany({
        where: { academicYearSchoolId: academicYear.id, deletedAt: null },
        orderBy: { date: "asc" },
        select: {
          id: true,
          date: true,
          lessonPlanNumber: true,
          sessionType: true,
        },
      })
    : [];

  const weeks = buildLessonPlanWeekOptions(calendarDays);
  const currentWeek = selectCurrentLessonPlanWeek(weeks);

  const selectedGradeId =
    resolvedGradeId && grades.some((grade) => grade.id === resolvedGradeId)
      ? resolvedGradeId
      : grades[0]?.id ?? null;

  const selectedLessonPlanNumber =
    params?.lessonPlanNumber &&
    weeks.some((week) => week.lessonPlanNumber === params.lessonPlanNumber)
      ? params.lessonPlanNumber
      : currentWeek?.lessonPlanNumber ?? weeks[0]?.lessonPlanNumber ?? null;

  const docsDriveFolderId = docsFolder?.docsDriveFolderId ?? null;
  const driveConfigured = isLessonPlanDriveReady() && Boolean(docsDriveFolderId);

  const selectedWeek =
    selectedLessonPlanNumber != null
      ? weeks.find((week) => week.lessonPlanNumber === selectedLessonPlanNumber) ??
        null
      : null;

  const selectedDay = selectedWeek
    ? {
        lessonPlanNumber: selectedWeek.lessonPlanNumber,
        date: selectedWeek.date.toISOString(),
        sessionType: selectedWeek.sessionType,
        sessionTypeLabel: lessonPlanSessionTypeLabel(selectedWeek.sessionType),
        isInstructional: isLessonPlanInstructionDay(selectedWeek.sessionType),
      }
    : null;

  const selectedGrade =
    selectedGradeId != null
      ? grades.find((grade) => grade.id === selectedGradeId) ?? null
      : null;

  let documents: LessonPlanDocumentRow[] = [];
  let driveError: string | null = null;
  let missingReasons: string[] = [];

  if (
    selectedGrade &&
    selectedWeek &&
    selectedDay?.isInstructional &&
    docsDriveFolderId &&
    isLessonPlanDriveReady()
  ) {
    try {
      const driveFile = await findLessonPlanDriveFile({
        academicYearFolderId: docsDriveFolderId,
        gradeName: selectedGrade.name,
        lessonPlanNumber: selectedWeek.lessonPlanNumber,
      });

      if (driveFile) {
        documents = [
          {
            fileId: driveFile.fileId,
            fileName: driveFile.fileName,
            gradeId: selectedGrade.id,
            gradeName: selectedGrade.name,
            lessonPlanNumber: selectedWeek.lessonPlanNumber,
            weekDate: selectedWeek.date.toISOString(),
          },
        ];
      } else {
        missingReasons = buildMissingLessonPlanReasons({
          gradeName: selectedGrade.name,
          lessonPlanNumber: selectedWeek.lessonPlanNumber,
          academicYearName: docsFolder?.academicYearName ?? null,
          docsDriveFolderId,
          driveConfigured,
        });
      }
    } catch (error) {
      driveError =
        error instanceof Error ? error.message : "Could not load lesson plan";
    }
  } else if (
    selectedGrade &&
    selectedWeek &&
    selectedDay?.isInstructional &&
    !driveConfigured
  ) {
    missingReasons = buildMissingLessonPlanReasons({
      gradeName: selectedGrade.name,
      lessonPlanNumber: selectedWeek.lessonPlanNumber,
      academicYearName: docsFolder?.academicYearName ?? null,
      docsDriveFolderId,
      driveConfigured,
    });
  }

  return {
    schoolId: school.id,
    schoolName: school.name,
    academicYearName: docsFolder?.academicYearName ?? null,
    driveConfigured,
    docsDriveFolderId,
    grades,
    weeks,
    selectedGradeId,
    selectedLessonPlanNumber,
    selectedDay,
    documents,
    driveError,
    missingReasons,
  };
}

export async function getLessonPlanPdfForDownload(params: {
  schoolId: string;
  gradeId: number;
  lessonPlanNumber: number;
}) {
  const user = await requirePermission("lesson-plans:read");
  const { grade } = await assertLessonPlanGradeAccess(
    user,
    params.schoolId,
    params.gradeId
  );

  const selectedYear = await getSelectedAcademicYear(user);
  const academicYear = await resolveAcademicYearForSchool(
    params.schoolId,
    selectedYear
  );
  if (!academicYear) {
    throw new Error("Academic year not found for this school");
  }

  const calendarDay = await prisma.academicCalendarDay.findFirst({
    where: {
      academicYearSchoolId: academicYear.id,
      lessonPlanNumber: params.lessonPlanNumber,
      deletedAt: null,
    },
    select: { sessionType: true },
  });
  if (!calendarDay || !isLessonPlanInstructionDay(calendarDay.sessionType)) {
    throw new Error("Lesson plans are only available on instructional days");
  }

  const docsFolder = await resolveDocsDriveFolderForSchool(user, params.schoolId);
  const docsDriveFolderId = docsFolder?.docsDriveFolderId ?? null;
  if (!docsDriveFolderId || !isLessonPlanDriveReady()) {
    throw new Error("Lesson plan Google Drive is not configured for this academic year");
  }

  const driveFile = await findLessonPlanDriveFile({
    academicYearFolderId: docsDriveFolderId,
    gradeName: grade.name,
    lessonPlanNumber: params.lessonPlanNumber,
  });

  if (!driveFile) {
    throw new Error("Lesson plan PDF not found for the selected week");
  }

  if (!docsFolder) {
    throw new Error("Lesson plan Google Drive is not configured for this academic year");
  }

  return {
    schoolId: params.schoolId,
    academicYearId: docsFolder.academicYearId,
    gradeId: params.gradeId,
    lessonPlanNumber: params.lessonPlanNumber,
    fileId: driveFile.fileId,
    fileName: driveFile.fileName,
    mimeType: driveFile.mimeType,
  };
}
