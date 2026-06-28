/**
 * Generates the FWIS multi-school Excel import template.
 * Usage: npm run import:template
 */
import ExcelJS from "exceljs";
import path from "node:path";
import fs from "node:fs";
import {
  ASSESSMENT_COLUMNS,
  ATTENDANCE_COLUMNS,
  CALENDAR_COLUMNS,
  EXAMPLE_ASSESSMENTS,
  EXAMPLE_ATTENDANCE,
  EXAMPLE_CALENDAR,
  EXAMPLE_SCHOOL_SETUP,
  EXAMPLE_STUDENTS,
  EXAMPLE_TEACHERS,
  INSTRUCTIONS_LINES,
  SCHOOL_SETUP_COLUMNS,
  SHEET_NAMES,
  STUDENT_COLUMNS,
  TEACHER_COLUMNS,
} from "./import/sheet-spec";

const OUTPUT_DIR = path.join(process.cwd(), "templates");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "fwis-school-data-import-template.xlsx");

function styleHeaderRow(sheet: ExcelJS.Worksheet, columnCount: number) {
  const row = sheet.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E40AF" },
  };
  row.alignment = { vertical: "middle", horizontal: "center" };
  row.height = 22;

  for (let col = 1; col <= columnCount; col++) {
    sheet.getColumn(col).width = 18;
  }
}

function addDataSheet<T extends Record<string, string>>(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  columns: readonly string[],
  examples: T[]
) {
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow([...columns]);
  styleHeaderRow(sheet, columns.length);

  for (const example of examples) {
    sheet.addRow(columns.map((col) => example[col] ?? ""));
  }

  sheet.views = [{ state: "frozen", ySplit: 1 }];
  return sheet;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FWIS";
  workbook.created = new Date();

  const instructions = workbook.addWorksheet(SHEET_NAMES.instructions);
  instructions.getColumn(1).width = 100;
  INSTRUCTIONS_LINES.forEach((line, index) => {
    const row = instructions.getRow(index + 1);
    row.getCell(1).value = line;
    if (index === 0) {
      row.font = { bold: true, size: 14 };
    }
  });

  addDataSheet(
    workbook,
    SHEET_NAMES.schoolSetup,
    SCHOOL_SETUP_COLUMNS,
    [EXAMPLE_SCHOOL_SETUP]
  );

  addDataSheet(workbook, SHEET_NAMES.teachers, TEACHER_COLUMNS, EXAMPLE_TEACHERS);
  addDataSheet(workbook, SHEET_NAMES.students, STUDENT_COLUMNS, EXAMPLE_STUDENTS);
  addDataSheet(
    workbook,
    SHEET_NAMES.attendance,
    ATTENDANCE_COLUMNS,
    EXAMPLE_ATTENDANCE
  );
  addDataSheet(
    workbook,
    SHEET_NAMES.assessments,
    ASSESSMENT_COLUMNS,
    EXAMPLE_ASSESSMENTS
  );

  const calendarSheet = addDataSheet(
    workbook,
    SHEET_NAMES.calendarOptional,
    CALENDAR_COLUMNS,
    EXAMPLE_CALENDAR
  );
  calendarSheet.getColumn(2).width = 22;

  await workbook.xlsx.writeFile(OUTPUT_FILE);

  console.log("Import template created:");
  console.log(`  ${OUTPUT_FILE}`);
  console.log("");
  console.log("Sheets:");
  console.log("  Instructions      — how to fill the workbook");
  console.log("  School_Setup      — school name, city, state, academic year");
  console.log("  Teachers          — teachers assigned to one grade each");
  console.log("  Students          — enrolled students");
  console.log("  Attendance        — one row per student per Sunday");
  console.log("  Assessments       — quiz and exam scores");
  console.log("  Calendar_Optional — custom Sunday session types (optional)");
  console.log("");
  console.log("Share this file with each school. After they fill it in:");
  console.log("  npm run import:school -- --file templates/your-school.xlsx --dry-run");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
