/**
 * Unpivot wide attendance sheet (student rows × date columns) into long format:
 * Student First Name | Student Last Name | Attendance Date | Attendance Code
 *
 * Usage:
 *   npx tsx scripts/unpivot-attendance.ts
 *   npx tsx scripts/unpivot-attendance.ts --input path/to/wide.tsv --output path/to/long.csv
 *
 * Date columns like 8/10 are mapped to YYYY-MM-DD using academic year start (default 2025):
 *   Aug–Dec → start year, Jan–May → start year + 1
 */

import fs from "node:fs";
import path from "node:path";

const DEFAULT_INPUT = path.join(__dirname, "import", "data", "attendance-wide.tsv");
const DEFAULT_OUTPUT = path.join(__dirname, "import", "data", "attendance-long.csv");

const ATTENDANCE_CODE_MAP: Record<string, string> = {
  P: "Present",
  A: "Absent",
  H: "Holiday",
  U: "Unmarked",
};

function parseArgs() {
  const args = process.argv.slice(2);
  let input = DEFAULT_INPUT;
  let output = DEFAULT_OUTPUT;
  let academicYearStart = 2025;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--input" && args[i + 1]) input = path.resolve(args[++i]);
    else if (args[i] === "--output" && args[i + 1]) output = path.resolve(args[++i]);
    else if (args[i] === "--year" && args[i + 1]) academicYearStart = Number(args[++i]);
  }

  return { input, output, academicYearStart };
}

function parseDateColumn(column: string, academicYearStart: number): string | null {
  const match = column.trim().match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = month >= 8 ? academicYearStart : academicYearStart + 1;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function splitStudentName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function normalizeAttendanceCode(code: string): string {
  const key = code.trim().toUpperCase();
  const mapped = ATTENDANCE_CODE_MAP[key];
  if (!mapped) {
    throw new Error(`Unknown attendance code "${code}". Expected P, A, H, or U.`);
  }
  return mapped;
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function unpivot(inputPath: string, outputPath: string, academicYearStart: number) {
  const raw = fs.readFileSync(inputPath, "utf8").replace(/\r\n/g, "\n").trimEnd();
  const lines = raw.split("\n");
  if (lines.length < 2) {
    throw new Error("Input must have a header row and at least one data row.");
  }

  const headers = lines[0].split("\t");
  const dateColumns: Array<{ index: number; label: string; isoDate: string }> = [];

  for (let i = 1; i < headers.length; i++) {
    const label = headers[i].trim();
    const isoDate = parseDateColumn(label, academicYearStart);
    if (isoDate) {
      dateColumns.push({ index: i, label, isoDate });
    }
  }

  if (dateColumns.length === 0) {
    throw new Error("No date columns found in header (expected M/D format, e.g. 8/10).");
  }

  const rows: string[] = [
    "Student First Name,Student Last Name,Attendance Date,Attendance Code",
  ];
  let recordCount = 0;
  let studentCount = 0;

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const cells = lines[lineIndex].split("\t");
    const studentName = (cells[0] ?? "").trim();
    if (!studentName) continue;

    const { firstName, lastName } = splitStudentName(studentName);
    studentCount++;

    for (const { index, isoDate } of dateColumns) {
      const code = (cells[index] ?? "").trim();
      if (!code) continue;

      const attendanceCode = normalizeAttendanceCode(code);
      if (attendanceCode === "Holiday" || attendanceCode === "Unmarked") continue;

      rows.push(
        [
          escapeCsv(firstName),
          escapeCsv(lastName),
          escapeCsv(isoDate),
          escapeCsv(attendanceCode),
        ].join(",")
      );
      recordCount++;
    }
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${rows.join("\n")}\n`, "utf8");

  console.log(`Input:   ${inputPath}`);
  console.log(`Output:  ${outputPath}`);
  console.log(`Students: ${studentCount}`);
  console.log(`Records:  ${recordCount}`);
  console.log(`Dates:    ${dateColumns.length} (${dateColumns[0].isoDate} … ${dateColumns.at(-1)!.isoDate})`);
}

const { input, output, academicYearStart } = parseArgs();
unpivot(input, output, academicYearStart);
