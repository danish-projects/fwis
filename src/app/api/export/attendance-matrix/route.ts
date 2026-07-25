import { NextRequest } from "next/server";
import { buildAttendanceMatrixExportBuffer } from "@/actions/matrix-export";
import { excelResponse } from "@/lib/export";
import { attendanceMatrixExportSchema } from "@/lib/validations/attendance-export";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const parsed = attendanceMatrixExportSchema.safeParse({
    schoolId: searchParams.get("schoolId") ?? undefined,
    classroom: searchParams.get("classroom") ?? undefined,
  });

  if (!parsed.success) {
    return new Response("Invalid export parameters", { status: 400 });
  }

  try {
    const { buffer, filename } = await buildAttendanceMatrixExportBuffer(parsed.data);
    return excelResponse(buffer, filename);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    return new Response(message, { status: 403 });
  }
}
