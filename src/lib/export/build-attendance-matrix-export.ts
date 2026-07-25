import type { AttendanceStatus, SessionType } from "@/lib/setup-types";
import { formatLessonPlanLabel } from "@/lib/calendar/lesson-plan";
import {
  getAttendanceWeekSummary,
  summarizeStudentAttendance,
} from "@/lib/attendance/consolidate-attendance-stats";
import {
  formatAttendanceStatusForExport,
  formatDateForExport,
} from "@/lib/export/build-school-backup-workbook";

export type AttendanceMatrixExportInput = {
  calendarDays: Array<{
    id: string;
    date: Date;
    lessonPlanNumber: number | null;
    sessionType: SessionType;
  }>;
  students: Array<{
    enrollmentId: string;
    studentName: string;
    studentNumber: string | null;
    gradeName: string;
    classroomName: string;
    cells: Record<string, { status: AttendanceStatus | null }>;
  }>;
  showGradeColumn: boolean;
};

function dayColumnHeader(day: AttendanceMatrixExportInput["calendarDays"][0]) {
  return `${formatLessonPlanLabel(day.lessonPlanNumber)} (${formatDateForExport(day.date)})`;
}

export function buildAttendanceMatrixExportRows(
  input: AttendanceMatrixExportInput
): Record<string, unknown>[] {
  const weekSummary = getAttendanceWeekSummary(input.calendarDays);

  return input.students.map((student) => {
    const row: Record<string, unknown> = {
      "Student Number": student.studentNumber ?? "",
      "Student Name": student.studentName,
    };

    if (input.showGradeColumn) {
      row.Grade = student.gradeName;
      row.Classroom = student.classroomName;
    }

    for (const day of input.calendarDays) {
      const status = student.cells[day.id]?.status ?? null;
      row[dayColumnHeader(day)] = status
        ? formatAttendanceStatusForExport(status)
        : "";
    }

    const totals = summarizeStudentAttendance(
      input.calendarDays,
      (dayId) => student.cells[dayId]?.status ?? null,
      weekSummary.pastWeeks,
      (day) =>
        weekSummary.pastEditableDays.some((pastDay) => pastDay.id === day.id)
    );

    row["Present %"] = totals.presentPct;
    row["Absent %"] = totals.absentPct;

    return row;
  });
}

export function slugifyExportName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
