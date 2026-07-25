/**
 * Generates the FWIS Staff + Students Excel import template.
 * Usage: npm run import:template
 */
import fs from "node:fs";
import path from "node:path";
import {
  buildImportTemplateWorkbook,
  IMPORT_TEMPLATE_FILENAME,
} from "../src/lib/import/build-import-template";

const OUTPUT_DIR = path.join(process.cwd(), "templates");
const OUTPUT_FILE = path.join(OUTPUT_DIR, IMPORT_TEMPLATE_FILENAME);

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const buffer = await buildImportTemplateWorkbook();
  fs.writeFileSync(OUTPUT_FILE, buffer);

  console.log("Import template created:");
  console.log(`  ${OUTPUT_FILE}`);
  console.log("");
  console.log("Sheets:");
  console.log("  Instructions  — how to fill the workbook");
  console.log("  Staff         — staff roster (login derived from school/grade/section)");
  console.log("  Students      — students enrolled by grade + section");
  console.log("");
  console.log("Prerequisites: school, academic year link, and app users must already exist.");
  console.log("Download from the app: Backup → Import template");
  console.log("After filling:");
  console.log("  npm run import:school -- --file templates/your-school.xlsx --dry-run");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
