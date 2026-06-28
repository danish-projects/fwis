import { NextRequest } from "next/server";
import { exportStudentsCsv } from "@/actions/students";
import { csvResponse, toCsv } from "@/lib/export";
import { studentExportSchema } from "@/lib/validations/student";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const parsed = studentExportSchema.safeParse({
    search: searchParams.get("search") ?? undefined,
    gender: searchParams.get("gender") || undefined,
    isActive: searchParams.get("isActive") || undefined,
  });

  if (!parsed.success) {
    return new Response("Invalid export parameters", { status: 400 });
  }

  try {
    const rows = await exportStudentsCsv(parsed.data);
    const csv = toCsv(rows);
    return csvResponse(csv, "students-export");
  } catch {
    return new Response("Unauthorized or export failed", { status: 403 });
  }
}
