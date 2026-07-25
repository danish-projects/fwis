import ExcelJS from "exceljs";
import type { AssessmentTypeCode } from "@/lib/setup-types";
import {
  ASSESSMENT_COLUMNS,
  ASSESSMENT_COLUMN_BY_TYPE,
  ATTENDANCE_COLUMNS,
  BACKUP_STAFF_COLUMNS,
  CALENDAR_COLUMNS,
  SCHOOL_SETUP_COLUMNS,
  SHEET_NAMES,
  STUDENT_COLUMNS,
} from "@/lib/import/sheet-spec";

export type SchoolBackupRow = Record<string, string>;

export type SchoolYearBackupData = {
  schoolName: string;
  city: string;
  state: string;
  academicYear: string;
  yearStartDate: string;
  yearEndDate: string;
  exportedAt: string;
  staff: SchoolBackupRow[];
  students: SchoolBackupRow[];
  attendance: SchoolBackupRow[];
  assessments: SchoolBackupRow[];
  calendar: SchoolBackupRow[];
};

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

function addDataSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  columns: readonly string[],
  rows: SchoolBackupRow[]
) {
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow([...columns]);
  styleHeaderRow(sheet, columns.length);

  for (const row of rows) {
    sheet.addRow(columns.map((col) => row[col] ?? ""));
  }

  sheet.views = [{ state: "frozen", ySplit: 1 }];
  return sheet;
}

function backupInstructions(data: SchoolYearBackupData): string[] {
  return [
    "FWIS School Data Backup",
    "",
    `Exported: ${data.exportedAt}`,
    `School: ${data.schoolName} (${data.city}, ${data.state})`,
    `Academic year: ${data.academicYear}`,
    "",
    "This workbook is a full school-year backup (includes attendance / assessments / calendar).",
    "Roster import template is Staff + Students only; school and year must already exist.",
    "Sheets: School_Setup, Staff, Students, Attendance, Assessments, Calendar_Optional",
    "",
    "Student references use student_id (e.g. HOU-B1), not internal database IDs.",
    "For roster re-import, use the Staff + Students template from Backup → Import template.",
  ];
}

export async function buildSchoolBackupWorkbook(
  data: SchoolYearBackupData
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FWIS";
  workbook.created = new Date();

  const instructions = workbook.addWorksheet(SHEET_NAMES.instructions);
  instructions.getColumn(1).width = 100;
  backupInstructions(data).forEach((line, index) => {
    const row = instructions.getRow(index + 1);
    row.getCell(1).value = line;
    if (index === 0) {
      row.font = { bold: true, size: 14 };
    }
  });

  addDataSheet(workbook, SHEET_NAMES.schoolSetup, SCHOOL_SETUP_COLUMNS, [
    {
      school_name: data.schoolName,
      city: data.city,
      state: data.state,
      academic_year: data.academicYear,
      year_start_date: data.yearStartDate,
      year_end_date: data.yearEndDate,
    },
  ]);

  addDataSheet(workbook, SHEET_NAMES.staff, BACKUP_STAFF_COLUMNS, data.staff);
  addDataSheet(workbook, SHEET_NAMES.students, STUDENT_COLUMNS, data.students);
  addDataSheet(workbook, SHEET_NAMES.attendance, ATTENDANCE_COLUMNS, data.attendance);
  addDataSheet(workbook, SHEET_NAMES.assessments, ASSESSMENT_COLUMNS, data.assessments);

  const calendarSheet = addDataSheet(
    workbook,
    SHEET_NAMES.calendarOptional,
    CALENDAR_COLUMNS,
    data.calendar
  );
  calendarSheet.getColumn(2).width = 22;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function formatAttendanceStatusForExport(status: string): string {
  const map: Record<string, string> = {
    PRESENT: "Present",
    ABSENT: "Absent",
    TARDY: "Tardy",
  };
  return map[status] ?? status;
}

export function formatDateForExport(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function buildAssessmentRow(
  scope: { city: string; state: string; academicYear: string },
  studentId: string,
  scores: Partial<Record<AssessmentTypeCode, number>>
): SchoolBackupRow {
  const row: SchoolBackupRow = {
    school_city: scope.city,
    school_state: scope.state,
    academic_year: scope.academicYear,
    student_id: studentId,
    quiz_1: "",
    quiz_2: "",
    quiz_3: "",
    quiz_4: "",
    quiz_5: "",
    midterm_project: "",
    final_exam: "",
  };

  for (const [type, column] of Object.entries(ASSESSMENT_COLUMN_BY_TYPE)) {
    const score = scores[type as AssessmentTypeCode];
    if (score != null) {
      row[column] = String(score);
    }
  }

  return row;
}
