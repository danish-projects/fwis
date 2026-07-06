import { NextRequest } from "next/server";
import { getLessonPlanPdfForDownload } from "@/actions/lesson-plans";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { fetchLessonPlanPdfBuffer } from "@/lib/google-drive/lesson-plans";
import {
  buildLessonPlanCacheKey,
  readCachedLessonPlan,
  writeCachedLessonPlan,
} from "@/lib/lesson-plans/temp-cache";

function pdfResponse(
  buffer: Buffer,
  fileName: string,
  disposition: "inline" | "attachment"
) {
  const safeName = fileName.replace(/[^\w.\- ]+/g, "_");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user.roles, "lesson-plans:read")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const schoolId = searchParams.get("schoolId")?.trim();
  const gradeId = Number(searchParams.get("gradeId"));
  const lessonPlanNumber = Number(searchParams.get("lessonPlanNumber"));
  const mode = searchParams.get("mode") === "download" ? "download" : "view";

  if (
    !schoolId ||
    !Number.isFinite(gradeId) ||
    gradeId < 1 ||
    !Number.isFinite(lessonPlanNumber) ||
    lessonPlanNumber < 1
  ) {
    return new Response("Invalid parameters", { status: 400 });
  }

  try {
    const fileMeta = await getLessonPlanPdfForDownload({
      schoolId,
      gradeId,
      lessonPlanNumber,
    });

    const cacheKey = buildLessonPlanCacheKey({
      schoolId: fileMeta.schoolId,
      academicYearId: fileMeta.academicYearId,
      gradeId: fileMeta.gradeId,
      lessonPlanNumber: fileMeta.lessonPlanNumber,
      fileId: fileMeta.fileId,
    });

    const cached = readCachedLessonPlan(cacheKey, fileMeta.fileName);
    const buffer =
      cached?.buffer ??
      (await fetchLessonPlanPdfBuffer({
        fileId: fileMeta.fileId,
        mimeType: fileMeta.mimeType,
      }));

    if (!cached) {
      writeCachedLessonPlan(cacheKey, fileMeta.fileName, buffer);
    }

    return pdfResponse(
      buffer,
      fileMeta.fileName,
      mode === "download" ? "attachment" : "inline"
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "File not found";
    const status = message === "Forbidden" ? 403 : 404;
    return new Response(message, { status });
  }
}
