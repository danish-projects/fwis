import ExcelJS from "exceljs";
import {
  ASSESSMENT_COLUMNS,
  ASSESSMENT_LEGACY_COLUMNS,
  ATTENDANCE_COLUMNS,
  ATTENDANCE_LEGACY_COLUMNS,
  CALENDAR_COLUMNS,
  SCHOOL_SETUP_COLUMNS,
  SHEET_NAMES,
  STUDENT_COLUMNS,
  TEACHER_COLUMNS,
} from "./sheet-spec";

export type RowRecord = Record<string, string>;

function cellValue(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
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
    throw new Error(`Missing sheet "${sheetName}". Use the FWIS import template.`);
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
    throw new Error(`Missing sheet "${sheetName}". Use the FWIS import template.`);
  }

  const headers = getSheetHeaders(workbook, sheetName);
  const normalizedExpected = expectedColumns.map((c) => c.toLowerCase());
  for (const col of normalizedExpected) {
    if (!headers.includes(col)) {
      throw new_string(`Sheet "${sheetName}" is missing column "${col}".`);
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

function hasColumns(headers: string[], columns: readonly string[]): boolean {
  const normalized = columns.map((c) => c.toLowerCase());
  return normalized.every((col) => headers.includes(col));
}

function readStudentLinkedSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  primaryColumns: readonly string[],
  legacyColumns: readonly string[]
): RowRecord[] {
  const headers = getSheetHeaders(workbook, sheetName);

  if (hasColumns(headers, primaryColumns)) {
    return readSheetRows(workbook, sheetName, primaryColumns);
  }

  if (hasColumns(headers, [...primaryColumns.slice(0, 3), ...legacyColumns, ...primaryColumns.slice(4)])) {
    // Legacy workbook: school fields + name/grade/section + remaining score/date columns
    const legacyExpected = [
      ...primaryColumns.slice(0, 3),
      ...legacyColumns,
      ...primaryColumns.slice(4),
    ];
    return readSheetRows(workbook, sheetName, legacyExpected);
  }

  throw new Error(
    `Sheet "${sheetName}" must include column "student_id" (new template) or legacy columns ${legacyColumns.join(", ")}.`
  );
}

export type ImportWorkbookData = {
  schoolSetup: RowRecord[];
  teachers: RowRecord[];
  students: RowRecord[];
  attendance: RowRecord[];
  assessments: RowRecord[];
  calendarOptional: RowRecord[];
};

export async function readImportWorkbook(filePath: string): Promise<ImportWorkbookData> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  return {
    schoolSetup: readSheetRows(workbook, SHEET_NAMES.schoolSetup, SCHOOL_SETUP_COLUMNS),
    teachers: readSheetRows(workbook, SHEET_NAMES.teachers, TEACHER_COLUMNS),
    students: readSheetRows(workbook, SHEET_NAMES.students, STUDENT_COLUMNS),
    attendance: readStudentLinkedSheet(
      workbook,
      SHEET_NAMES.attendance,
      ATTENDANCE_COLUMNS,
      ATTENDANCE_LEGACY_COLUMNS
    ),
    assessments: readStudentLinkedSheet(
      workbook,
      SHEET_NAMES.assessments,
      ASSESSMENT_COLUMNS,
      ASSESSMENT_LEGACY_COLUMNS
    ),
    calendarOptional: readSheetRows(
      workbook,
      SHEET_NAMES.calendarOptional,
      CALENDAR_COLUMNS
    ),
  };
}
