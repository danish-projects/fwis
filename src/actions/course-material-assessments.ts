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
  fetchAssessmentMaterialFileBuffer,
  isAssessmentMaterialDriveReady,
  listAssessmentMaterialDriveFiles,
} from "@/lib/google-drive/assessments";
import { assertAssessmentMaterialGradeAccess } from "@/lib/course-materials/access";
import { resolveGradeIdFromParam } from "@/lib/lesson-plans/page-params";
import { getSelectedSchool } from "@/lib/school/resolve-school";
import {
  COURSE_MATERIAL_ASSESSMENT_OPTIONS,
  parseCourseMaterialAssessmentType,
  type CourseMaterialAssessmentType,
} from "@/lib/course-materials/assessment-types";

export type CourseMaterialAssessmentGradeOption = {
  id: number;
  name: string;
};

export type CourseMaterialAssessmentDocument = {
  fileId: string;
  fileName: string;
  mimeType: string;
};

export type CourseMaterialAssessmentsPageData = {
  schoolId: string;
  schoolName: string;
  academicYearName: string | null;
  driveConfigured: boolean;
  grades: CourseMaterialAssessmentGradeOption[];
  assessmentOptions: typeof COURSE_MATERIAL_ASSESSMENT_OPTIONS;
  selectedGradeId: number | null;
  selectedAssessmentType: CourseMaterialAssessmentType | null;
  documents: CourseMaterialAssessmentDocument[];
  driveError: string | null;
  folderPath: string | null;
};

async function resolveYearName(
  user: AuthUser,
  schoolId: string
): Promise<{ academicYearId: string; academicYearName: string } | null> {
  const selectedYear = await getSelectedAcademicYear(user);
  const schoolYear = await resolveAcademicYearForSchool(schoolId, selectedYear);
  if (!schoolYear) return null;
  return {
    academicYearId: schoolYear.academicYearId,
    academicYearName: schoolYear.academicYear.name,
  };
}

async function listGradesForCourseMaterials(
  user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>,
  schoolId: string
): Promise<CourseMaterialAssessmentGradeOption[]> {
  if (user.roles.includes("TEACHER") || user.roles.includes("SUBSTITUTE")) {
    const teacherClassrooms = await getTeacherClassrooms(user);
    const gradeMap = new Map<
      number,
      CourseMaterialAssessmentGradeOption & { sortOrder: number }
    >();

    for (const classroom of teacherClassrooms) {
      const belongs =
        classroom.schoolId === schoolId ||
        classroom.schoolLinks?.some((link) => link.schoolId === schoolId);
      if (!belongs) continue;
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
    where: {
      schoolLinks: {
        some: { schoolId, deletedAt: null, isActive: true },
      },
      deletedAt: null,
      isActive: true,
    },
    orderBy: [{ grade: { sortOrder: "asc" } }, { section: { name: "asc" } }],
    select: {
      grade: { select: { id: true, name: true, sortOrder: true } },
    },
  });

  const gradeMap = new Map<
    number,
    CourseMaterialAssessmentGradeOption & { sortOrder: number }
  >();
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

export async function getCourseMaterialAssessmentsPageData(params?: {
  gradeId?: number;
  gradeParam?: string;
  assessmentType?: string;
}): Promise<CourseMaterialAssessmentsPageData | null> {
  const user = await requirePermission("assessments:read");
  const selectedSchool = await getSelectedSchool(user);
  if (!selectedSchool) return null;

  const school = await prisma.school.findFirst({
    where: { id: selectedSchool.id, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!school) return null;

  const yearContext = await resolveYearName(user, school.id);
  const grades = await listGradesForCourseMaterials(user, school.id);
  const resolvedGradeId =
    params?.gradeId ?? resolveGradeIdFromParam(grades, params?.gradeParam);

  const selectedGradeId =
    resolvedGradeId && grades.some((grade) => grade.id === resolvedGradeId)
      ? resolvedGradeId
      : grades[0]?.id ?? null;

  const parsedType = parseCourseMaterialAssessmentType(params?.assessmentType);
  const selectedAssessmentType: CourseMaterialAssessmentType | null =
    parsedType ?? COURSE_MATERIAL_ASSESSMENT_OPTIONS[0]?.value ?? null;

  const selectedGrade =
    selectedGradeId != null
      ? grades.find((grade) => grade.id === selectedGradeId) ?? null
      : null;

  const driveConfigured = isAssessmentMaterialDriveReady();
  const academicYearName = yearContext?.academicYearName ?? null;

  let documents: CourseMaterialAssessmentDocument[] = [];
  let driveError: string | null = null;
  let folderPath: string | null = null;

  if (
    selectedGrade &&
    selectedAssessmentType &&
    academicYearName &&
    driveConfigured
  ) {
    const examLabel =
      COURSE_MATERIAL_ASSESSMENT_OPTIONS.find(
        (option) => option.value === selectedAssessmentType
      )?.label ?? selectedAssessmentType;
    folderPath = `FWIS Docs/${academicYearName}/Assessments/${examLabel}/${selectedGrade.name}`;

    try {
      documents = await listAssessmentMaterialDriveFiles({
        academicYearName,
        assessmentType: selectedAssessmentType,
        gradeName: selectedGrade.name,
      });
    } catch (error) {
      driveError =
        error instanceof Error
          ? error.message
          : "Could not load assessment materials";
    }
  }

  return {
    schoolId: school.id,
    schoolName: school.name,
    academicYearName,
    driveConfigured,
    grades,
    assessmentOptions: COURSE_MATERIAL_ASSESSMENT_OPTIONS,
    selectedGradeId,
    selectedAssessmentType,
    documents,
    driveError,
    folderPath,
  };
}

export async function getCourseMaterialAssessmentFileForDownload(params: {
  schoolId: string;
  gradeId: number;
  assessmentType: string;
  fileId: string;
}) {
  const user = await requirePermission("assessments:read");
  const { grade } = await assertAssessmentMaterialGradeAccess(
    user,
    params.schoolId,
    params.gradeId
  );

  const assessmentType = parseCourseMaterialAssessmentType(params.assessmentType);
  if (!assessmentType) {
    throw new Error("Invalid assessment type");
  }

  const yearContext = await resolveYearName(user, params.schoolId);
  if (!yearContext || !isAssessmentMaterialDriveReady()) {
    throw new Error(
      "Assessment Google Drive is not configured (set GOOGLE_DRIVE_FWIS_DOCS_FOLDER_ID and service account credentials)"
    );
  }

  const documents = await listAssessmentMaterialDriveFiles({
    academicYearName: yearContext.academicYearName,
    assessmentType,
    gradeName: grade.name,
  });

  const match = documents.find((doc) => doc.fileId === params.fileId);
  if (!match) {
    throw new Error("Assessment file not found for the selected filters");
  }

  return {
    schoolId: params.schoolId,
    academicYearId: yearContext.academicYearId,
    gradeId: params.gradeId,
    assessmentType,
    fileId: match.fileId,
    fileName: match.fileName,
    mimeType: match.mimeType,
  };
}

export async function loadCourseMaterialAssessmentFileBuffer(params: {
  fileId: string;
  mimeType: string;
}) {
  return fetchAssessmentMaterialFileBuffer(params);
}
