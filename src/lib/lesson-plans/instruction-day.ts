import { SESSION_TYPE_LABELS } from "@/lib/calendar/generate-sundays";
import { asSessionType } from "@/lib/setup-types";
import { buildLessonPlanFileBaseName } from "@/lib/google-drive/lesson-plans";

export function isLessonPlanInstructionDay(sessionType: string): boolean {
  return sessionType === "INSTRUCTIONAL";
}

export function lessonPlanSessionTypeLabel(sessionType: string): string {
  return (
    SESSION_TYPE_LABELS[asSessionType(sessionType)] ??
    sessionType.replace(/_/g, " ")
  );
}

export function buildMissingLessonPlanReasons(input: {
  gradeName: string;
  lessonPlanNumber: number;
  academicYearName: string | null;
  driveConfigured: boolean;
}): string[] {
  const expectedFileName = `${buildLessonPlanFileBaseName(
    input.gradeName,
    input.lessonPlanNumber
  )}.pdf`;
  const yearSegment = input.academicYearName ?? "<year>";

  const reasons = [
    `The PDF has not been uploaded yet for ${input.gradeName}, ${expectedFileName}.`,
    `The file name must match exactly: ${expectedFileName}.`,
    `The file should be in FWIS Docs/${yearSegment}/Lesson Plans/${input.gradeName}/.`,
  ];

  if (!input.driveConfigured) {
    reasons.unshift(
      "Google Drive is not fully configured (service account credentials or GOOGLE_DRIVE_FWIS_DOCS_FOLDER_ID missing)."
    );
  } else {
    reasons.push(
      "Confirm a Drive folder named exactly like the academic year exists under FWIS Docs, and the service account has Viewer access."
    );
  }

  return reasons;
}
