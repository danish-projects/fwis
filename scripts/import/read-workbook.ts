import ExcelJS from "exceljs";
import { calendarDateKey } from "../../src/lib/calendar/calendar-date";
import {
  FORBIDDEN_IMPORT_SHEETS,
  IMPORT_SHEET_NAMES,
  STAFF_COLUMNS,
  STUDENT_COLUMNS,
} from "./sheet-spec";

export type RowRecord = Record<string, string>;

function cellValue(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) {
    return calendarDateKey(value);
  }
  if (typeof value === "object" && "text" in value) {
    return String(value.text ?? "").trim();
  }
  if (typeof value === "object" && "result" in value) {
    return String(value.result ?? "").trim();
  }
  return String(value).trim();
}

function getSheetHeaders(workbook: ExcelJS.Workbook, sheetName: string): string[] {
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    throw new Error(
      `Missing sheet "${sheetName}". Use the FWIS Staff + Students import template.`
    );
  }

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = cellValue(cell.value).toLowerCase();
  });
  return headers;
}

function readSheetRows(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  expectedColumns: readonly string[]
): RowRecord[] {
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    throw new Error(
      `Missing sheet "${sheetName}". Use the FWIS Staff + Students import template.`
    );
  }

  const headers = getSheetHeaders(workbook, sheetName);
  const normalizedExpected = expectedColumns.map((c) => c.toLowerCase());
  for (const col of normalizedExpected) {
    if (!headers.includes(col)) {
      throw new Error(`Sheet "${sheetName}" is missing column "${col}".`);
    }
  }

  const rows: RowRecord[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const record: RowRecord = {};
    let hasValue = false;
    headers.forEach((header, index) => {
      if (!header) return;
      const value = cellValue(row.getCell(index + 1).value);
      if (value) hasValue = true;
      record[header] = value;
    });

    if (hasValue) rows.push(record);
  });

  return rows;
}

function assertNoForbiddenSheets(workbook: ExcelJS.Workbook) {
  const found: string[] = [];
  for (const name of FORBIDDEN_IMPORT_SHEETS) {
    if (workbook.getWorksheet(name)) found.push(name);
  }
  if (found.length > 0) {
    throw new Error(
      `This workbook includes sheets that are not imported: ${found.join(", ")}. ` +
        `Use the Staff + Students template only (npm run import:template).`
    );
  }
}

export type ImportWorkbookData = {
  staff: RowRecord[];
  students: RowRecord[];
};

export async function readImportWorkbook(filePath: string): Promise<ImportWorkbookData> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  assertNoForbiddenSheets(workbook);

  return {
    staff: readSheetRows(workbook, IMPORT_SHEET_NAMES.staff, STAFF_COLUMNS),
    students: readSheetRows(workbook, IMPORT_SHEET_NAMES.students, STUDENT_COLUMNS),
  };
}
