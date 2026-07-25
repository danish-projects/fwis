import { NextRequest } from "next/server";
import { buildAssessmentMatrixExportBuffer } from "@/actions/matrix-export";
import { excelResponse } from "@/lib/export";
import { assessmentMatrixExportSchema } from "@/lib/validations/assessment-export";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const parsed = assessmentMatrixExportSchema.safeParse({
    classroomId: searchParams.get("classroomId") ?? undefined,
    year: searchParams.get("year") ?? undefined,
  });

  if (!parsed.success) {
    return new Response("Invalid export parameters", { status: 400 });
  }

  try {
    const { buffer, filename } = await buildAssessmentMatrixExportBuffer(parsed.data);
    return excelResponse(buffer, filename);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    return new Response(message, { status: 403 });
  }
}
