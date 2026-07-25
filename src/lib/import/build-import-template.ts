import ExcelJS from "exceljs";
import {
  EXAMPLE_STUDENTS,
  EXAMPLE_STAFF,
  IMPORT_TEMPLATE_FILENAME,
  IMPORT_SHEET_NAMES,
  INSTRUCTIONS_LINES,
  STUDENT_COLUMNS,
  STAFF_COLUMNS,
} from "./import-template-content";

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

export async function buildImportTemplateWorkbook(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FWIS";
  workbook.created = new Date();

  const instructions = workbook.addWorksheet(IMPORT_SHEET_NAMES.instructions);
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
    IMPORT_SHEET_NAMES.staff,
    STAFF_COLUMNS,
    EXAMPLE_STAFF
  );
  addDataSheet(
    workbook,
    IMPORT_SHEET_NAMES.students,
    STUDENT_COLUMNS,
    EXAMPLE_STUDENTS
  );

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export { IMPORT_TEMPLATE_FILENAME } from "./import-template-content";
