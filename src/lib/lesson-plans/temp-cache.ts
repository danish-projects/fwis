import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CACHE_ROOT = path.join(os.tmpdir(), "fwis-lesson-plans");
const CACHE_TTL_MS = 60 * 60 * 1000;

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function cacheDirForKey(cacheKey: string): string {
  return path.join(CACHE_ROOT, cacheKey);
}

function cacheFilePath(cacheKey: string, fileName: string): string {
  return path.join(cacheDirForKey(cacheKey), sanitizeFileName(fileName));
}

export function readCachedLessonPlan(
  cacheKey: string,
  fileName: string
): { filePath: string; buffer: Buffer } | null {
  const filePath = cacheFilePath(cacheKey, fileName);
  if (!fs.existsSync(filePath)) return null;

  const stat = fs.statSync(filePath);
  if (Date.now() - stat.mtimeMs > CACHE_TTL_MS) {
    fs.rmSync(cacheDirForKey(cacheKey), { recursive: true, force: true });
    return null;
  }

  return {
    filePath,
    buffer: fs.readFileSync(filePath),
  };
}

export function writeCachedLessonPlan(
  cacheKey: string,
  fileName: string,
  buffer: Buffer
): string {
  const dir = cacheDirForKey(cacheKey);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, sanitizeFileName(fileName));
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export function buildLessonPlanCacheKey(params: {
  schoolId: string;
  academicYearId: string;
  gradeId: number;
  lessonPlanNumber: number;
  fileId: string;
}): string {
  return `${params.schoolId}-${params.academicYearId}-${params.gradeId}-${params.lessonPlanNumber}-${params.fileId}`;
}
