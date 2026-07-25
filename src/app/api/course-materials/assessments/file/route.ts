import { NextRequest } from "next/server";
import {
  getCourseMaterialAssessmentFileForDownload,
  loadCourseMaterialAssessmentFileBuffer,
} from "@/actions/course-material-assessments";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

function fileResponse(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  disposition: "inline" | "attachment"
) {
  const safeName = fileName.replace(/[^\w.\- ]+/g, "_");
  const isGoogleDoc = mimeType === "application/vnd.google-apps.document";
  const contentType = isGoogleDoc ? "application/pdf" : mimeType || "application/octet-stream";
  const downloadName =
    isGoogleDoc && !safeName.toLowerCase().endsWith(".pdf")
      ? `${safeName}.pdf`
      : safeName;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${disposition}; filename="${downloadName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user.roles, "assessments:read")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const schoolId = searchParams.get("schoolId")?.trim();
  const gradeId = Number(searchParams.get("gradeId"));
  const assessmentType = searchParams.get("assessmentType")?.trim() ?? "";
  const fileId = searchParams.get("fileId")?.trim();
  const mode = searchParams.get("mode") === "download" ? "download" : "view";

  if (
    !schoolId ||
    !fileId ||
    !Number.isFinite(gradeId) ||
    gradeId < 1 ||
    !assessmentType
  ) {
    return new Response("Invalid parameters", { status: 400 });
  }

  try {
    const fileMeta = await getCourseMaterialAssessmentFileForDownload({
      schoolId,
      gradeId,
      assessmentType,
      fileId,
    });

    const buffer = await loadCourseMaterialAssessmentFileBuffer({
      fileId: fileMeta.fileId,
      mimeType: fileMeta.mimeType,
    });

    return fileResponse(
      buffer,
      fileMeta.fileName,
      fileMeta.mimeType,
      mode === "download" ? "attachment" : "inline"
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "File not found";
    const status = message === "Forbidden" ? 403 : 404;
    return new Response(message, { status });
  }
}
