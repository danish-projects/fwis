import {
  downloadDriveFile,
  exportDriveGoogleDocAsPdf,
  findDriveFolderByName,
  getGoogleDriveAccessToken,
  listDriveFilesInFolder,
} from "@/lib/google-drive/client";
import {
  getGoogleDriveServiceAccount,
  isLessonPlanDriveConfigured,
} from "@/lib/google-drive/config";
import { resolveAcademicYearDriveFolderId } from "@/lib/google-drive/lesson-plans";
import {
  courseMaterialAssessmentFolderName,
  type CourseMaterialAssessmentType,
} from "@/lib/course-materials/assessment-types";

/** Subfolder under each academic year: FWIS Docs/{year}/Assessments */
export const ASSESSMENTS_DRIVE_SUBFOLDER = "Assessments";

export type AssessmentMaterialDriveFile = {
  fileId: string;
  fileName: string;
  mimeType: string;
};

export function isAssessmentMaterialDriveReady(): boolean {
  return isLessonPlanDriveConfigured();
}

/**
 * Resolve FWIS Docs/{year}/Assessments/{exam}/{grade}/ and list every non-folder file.
 */
export async function listAssessmentMaterialDriveFiles(params: {
  academicYearName: string;
  assessmentType: CourseMaterialAssessmentType;
  gradeName: string;
}): Promise<AssessmentMaterialDriveFile[]> {
  const account = getGoogleDriveServiceAccount();
  if (!account) {
    throw new Error("Google Drive is not configured");
  }

  const yearFolderId = await resolveAcademicYearDriveFolderId(
    params.academicYearName
  );
  if (!yearFolderId) {
    throw new Error(
      `Academic year folder "${params.academicYearName}" was not found under FWIS Docs`
    );
  }

  const accessToken = await getGoogleDriveAccessToken(account);
  const assessmentsFolder = await findDriveFolderByName(
    accessToken,
    yearFolderId,
    ASSESSMENTS_DRIVE_SUBFOLDER
  );
  if (!assessmentsFolder) {
    return [];
  }

  const examFolderName = courseMaterialAssessmentFolderName(params.assessmentType);
  const examFolder = await findDriveFolderByName(
    accessToken,
    assessmentsFolder.id,
    examFolderName
  );
  if (!examFolder) {
    return [];
  }

  const gradeFolder = await findDriveFolderByName(
    accessToken,
    examFolder.id,
    params.gradeName.trim()
  );
  if (!gradeFolder) {
    return [];
  }

  const files = await listDriveFilesInFolder(accessToken, gradeFolder.id);
  return files
    .filter((file) => file.mimeType === "application/pdf")
    .map((file) => ({
      fileId: file.id,
      fileName: file.name,
      mimeType: file.mimeType ?? "application/pdf",
    }))
    .sort((a, b) => a.fileName.localeCompare(b.fileName));
}

export async function fetchAssessmentMaterialFileBuffer(params: {
  fileId: string;
  mimeType: string;
}): Promise<Buffer> {
  const account = getGoogleDriveServiceAccount();
  if (!account) {
    throw new Error("Google Drive is not configured");
  }

  const accessToken = await getGoogleDriveAccessToken(account);

  if (params.mimeType === "application/vnd.google-apps.document") {
    return exportDriveGoogleDocAsPdf(accessToken, params.fileId);
  }

  return downloadDriveFile(accessToken, params.fileId);
}
