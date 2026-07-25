import {
  downloadDriveFile,
  exportDriveGoogleDocAsPdf,
  findDriveFileByNameInFolder,
  findDriveFolderByName,
  getGoogleDriveAccessToken,
  listDriveFilesInFolder,
  listDrivePdfFiles,
} from "@/lib/google-drive/client";
import {
  getFwisDocsParentFolderId,
  getGoogleDriveServiceAccount,
  isLessonPlanDriveConfigured,
} from "@/lib/google-drive/config";

/** Subfolder under each academic year folder, e.g. FWIS Docs/2024-2025/Lesson Plans */
export const LESSON_PLANS_DRIVE_SUBFOLDER = "Lesson Plans";

export type LessonPlanDriveFile = {
  fileId: string;
  fileName: string;
  mimeType: string;
};

function normalizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatLessonPlanWeekNumber(lessonPlanNumber: number): string {
  return String(lessonPlanNumber).padStart(2, "0");
}

/** Expected Drive file base name, e.g. "Grade 1 - Week - 01". */
export function buildLessonPlanFileBaseName(
  gradeName: string,
  lessonPlanNumber: number
): string {
  return `${gradeName} - Week - ${formatLessonPlanWeekNumber(lessonPlanNumber)}`;
}

function matchesLessonPlanFile(
  fileName: string,
  gradeName: string,
  lessonPlanNumber: number
): boolean {
  const normalized = normalizeFileName(fileName);
  const expected = normalizeFileName(
    buildLessonPlanFileBaseName(gradeName, lessonPlanNumber)
  );

  if (normalized === expected) return true;

  const expectedUnpadded = normalizeFileName(
    `${gradeName} - Week - ${lessonPlanNumber}`
  );
  return normalized === expectedUnpadded;
}

export function isLessonPlanDriveReady(): boolean {
  return isLessonPlanDriveConfigured();
}

/**
 * Resolve FWIS Docs/{academicYearName} under GOOGLE_DRIVE_FWIS_DOCS_FOLDER_ID.
 */
export async function resolveAcademicYearDriveFolderId(
  academicYearName: string
): Promise<string | null> {
  const parentId = getFwisDocsParentFolderId();
  const account = getGoogleDriveServiceAccount();
  if (!parentId || !account) return null;

  const accessToken = await getGoogleDriveAccessToken(account);
  const yearFolder = await findDriveFolderByName(
    accessToken,
    parentId,
    academicYearName.trim()
  );
  return yearFolder?.id ?? null;
}

function buildLessonPlanFileNameCandidates(
  gradeName: string,
  lessonPlanNumber: number
): string[] {
  const padded = buildLessonPlanFileBaseName(gradeName, lessonPlanNumber);
  const unpadded = `${gradeName} - Week - ${lessonPlanNumber}`;
  return [`${padded}.pdf`, padded, `${unpadded}.pdf`, unpadded];
}

async function resolveLessonPlansFolderId(
  accessToken: string,
  academicYearFolderId: string
): Promise<string | null> {
  const subfolder = await findDriveFolderByName(
    accessToken,
    academicYearFolderId,
    LESSON_PLANS_DRIVE_SUBFOLDER
  );
  if (subfolder) return subfolder.id;

  const files = await listDriveFilesInFolder(accessToken, academicYearFolderId);
  const hasLessonPlanFiles = files.some(
    (file) =>
      file.mimeType === "application/pdf" ||
      file.mimeType === "application/vnd.google-apps.document"
  );
  if (hasLessonPlanFiles) return academicYearFolderId;

  return null;
}

async function resolveGradeFolderId(
  accessToken: string,
  lessonPlansFolderId: string,
  gradeName: string
): Promise<string> {
  const gradeFolder = await findDriveFolderByName(
    accessToken,
    lessonPlansFolderId,
    gradeName
  );
  return gradeFolder?.id ?? lessonPlansFolderId;
}

async function findLessonPlanDriveFileInFolder(
  accessToken: string,
  folderId: string,
  gradeName: string,
  lessonPlanNumber: number
): Promise<LessonPlanDriveFile | null> {
  for (const candidate of buildLessonPlanFileNameCandidates(
    gradeName,
    lessonPlanNumber
  )) {
    const directMatch = await findDriveFileByNameInFolder(
      accessToken,
      folderId,
      candidate
    );
    if (directMatch) {
      return toLessonPlanDriveFile(directMatch);
    }
  }

  const pdfFiles = await listDrivePdfFiles(accessToken, folderId);
  const match = pdfFiles.find((file) =>
    matchesLessonPlanFile(file.name, gradeName, lessonPlanNumber)
  );
  if (!match) return null;

  return toLessonPlanDriveFile(match);
}

function toLessonPlanDriveFile(file: {
  id: string;
  name: string;
  mimeType?: string;
}): LessonPlanDriveFile {
  return {
    fileId: file.id,
    fileName: file.name,
    mimeType: file.mimeType ?? "application/pdf",
  };
}

function parseLessonPlanNumberFromFileName(
  fileName: string,
  gradeName: string
): number | null {
  const normalized = normalizeFileName(fileName);
  const gradePrefix = normalizeFileName(gradeName);
  if (!normalized.startsWith(gradePrefix)) return null;

  const weekMatch = normalized.match(/week\s*(\d+)\s*$/i);
  if (!weekMatch) return null;

  const lessonPlanNumber = Number(weekMatch[1]);
  return Number.isFinite(lessonPlanNumber) && lessonPlanNumber > 0
    ? lessonPlanNumber
    : null;
}

export async function listLessonPlanDriveFilesForGrade(params: {
  academicYearName: string;
  gradeName: string;
}): Promise<LessonPlanDriveFile[]> {
  const account = getGoogleDriveServiceAccount();
  if (!account) {
    throw new Error("Google Drive is not configured");
  }

  const academicYearFolderId = await resolveAcademicYearDriveFolderId(
    params.academicYearName
  );
  if (!academicYearFolderId) {
    throw new Error(
      `Academic year folder "${params.academicYearName}" was not found under FWIS Docs`
    );
  }

  const accessToken = await getGoogleDriveAccessToken(account);
  const lessonPlansFolderId = await resolveLessonPlansFolderId(
    accessToken,
    academicYearFolderId
  );
  if (!lessonPlansFolderId) return [];

  const gradeFolderId = await resolveGradeFolderId(
    accessToken,
    lessonPlansFolderId,
    params.gradeName
  );
  const files = await listDrivePdfFiles(accessToken, gradeFolderId);

  return files
    .map((file) => ({
      file: toLessonPlanDriveFile(file),
      lessonPlanNumber: parseLessonPlanNumberFromFileName(
        file.name,
        params.gradeName
      ),
    }))
    .filter(
      (entry): entry is { file: LessonPlanDriveFile; lessonPlanNumber: number } =>
        entry.lessonPlanNumber != null
    )
    .sort((a, b) => a.lessonPlanNumber - b.lessonPlanNumber)
    .map((entry) => entry.file);
}

export async function findLessonPlanDriveFile(params: {
  academicYearName: string;
  gradeName: string;
  lessonPlanNumber: number;
}): Promise<LessonPlanDriveFile | null> {
  const account = getGoogleDriveServiceAccount();
  if (!account) {
    throw new Error("Google Drive is not configured");
  }

  const academicYearFolderId = await resolveAcademicYearDriveFolderId(
    params.academicYearName
  );
  if (!academicYearFolderId) return null;

  const accessToken = await getGoogleDriveAccessToken(account);
  const lessonPlansFolderId = await resolveLessonPlansFolderId(
    accessToken,
    academicYearFolderId
  );
  if (!lessonPlansFolderId) return null;

  const gradeFolderId = await resolveGradeFolderId(
    accessToken,
    lessonPlansFolderId,
    params.gradeName
  );

  return findLessonPlanDriveFileInFolder(
    accessToken,
    gradeFolderId,
    params.gradeName,
    params.lessonPlanNumber
  );
}

export async function fetchLessonPlanPdfBuffer(params: {
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
