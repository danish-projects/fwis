import { NextRequest } from "next/server";
import { buildSchoolYearBackupBuffer } from "@/actions/school-data-backup";
import { excelResponse } from "@/lib/export";
import { schoolBackupExportSchema } from "@/lib/validations/backup";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const parsed = schoolBackupExportSchema.safeParse({
    schoolId: searchParams.get("schoolId") ?? undefined,
    yearId: searchParams.get("yearId") ?? undefined,
  });

  if (!parsed.success) {
    return new Response("Invalid export parameters", { status: 400 });
  }

  try {
    const { buffer, filename } = await buildSchoolYearBackupBuffer(parsed.data);
    return excelResponse(buffer, filename);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    return new Response(message, { status: 403 });
  }
}
