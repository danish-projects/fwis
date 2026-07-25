import { buildImportTemplateWorkbook, IMPORT_TEMPLATE_FILENAME } from "@/lib/import/build-import-template";
import { excelResponse } from "@/lib/export";
import { requirePermission, requireRole } from "@/lib/auth/session";

export async function GET() {
  try {
    await requireRole("NIGRA", "SCHOOL_ADMIN");
    await requirePermission("reports:export");

    const buffer = await buildImportTemplateWorkbook();
    return excelResponse(buffer, IMPORT_TEMPLATE_FILENAME);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Template download failed";
    return new Response(message, { status: 403 });
  }
}
