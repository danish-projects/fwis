"use client";

import { memo } from "react";
import { AttendanceStatus, SessionType } from "@/lib/setup-types";
import { ATTENDANCE_STATUS_OPTIONS } from "@/lib/attendance/behavior-options";
import {
  isEditableAttendanceSessionType,
  SESSION_TYPE_CELL_CLASSES,
} from "@/lib/attendance/session-type-styles";
import { formatDate, formatPercent } from "@/lib/utils";

type CalendarDay = {
  id: string;
  date: Date;
  lessonPlanNumber: number | null;
  sessionType: SessionType;
};

export type ConsolidateMatrixRowProps = {
  enrollmentId: string;
  studentName: string;
  studentNumber: string | null;
  gradeName: string;
  classroomName: string;
  showGradeColumn: boolean;
  calendarDays: CalendarDay[];
  getStatus: (dayId: string) => AttendanceStatus | null;
  present: number;
  absent: number;
  presentPct: number;
  absentPct: number;
  pastWeeks: number;
  canEdit: boolean;
  isLoading: boolean;
  onCellChange: (
    enrollmentId: string,
    dayId: string,
    status: AttendanceStatus | null
  ) => void;
};

function attendanceLabel(status: AttendanceStatus | null) {
  if (!status) return "—";
  return ATTENDANCE_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export const ConsolidateMatrixRow = memo(function ConsolidateMatrixRow({
  enrollmentId,
  studentName,
  studentNumber,
  gradeName,
  classroomName,
  showGradeColumn,
  calendarDays,
  getStatus,
  present,
  absent,
  presentPct,
  absentPct,
  pastWeeks,
  canEdit,
  isLoading,
  onCellChange,
}: ConsolidateMatrixRowProps) {
  return (
    <tr className="border-b last:border-0">
      <td className="sticky left-0 z-[1] min-w-[7.5rem] border-r bg-muted px-2 py-1 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)] sm:min-w-[10rem]">
        <div className="text-xs font-medium sm:text-sm">{studentName}</div>
        {studentNumber ? (
          <div className="font-mono text-[10px] text-muted-foreground">{studentNumber}</div>
        ) : null}
        <div className="text-[10px] text-muted-foreground">
          {showGradeColumn && `${gradeName} · `}
          {classroomName}
        </div>
      </td>
      {calendarDays.map((day) => {
        const status = getStatus(day.id);
        const editable = isEditableAttendanceSessionType(day.sessionType);

        return (
          <td
            key={day.id}
            className={`px-0.5 py-1 align-middle sm:px-1 ${SESSION_TYPE_CELL_CLASSES[day.sessionType]}`}
          >
            {!editable ? (
              <span className="block py-1 text-center text-muted-foreground">—</span>
            ) : canEdit ? (
              <select
                className="h-7 w-full min-w-0 rounded border border-input bg-background px-0.5 text-center text-[10px] font-medium shadow-sm sm:h-8 sm:text-[11px]"
                value={status ?? ""}
                onChange={(e) =>
                  onCellChange(
                    enrollmentId,
                    day.id,
                    (e.target.value || null) as AttendanceStatus | null
                  )
                }
                disabled={isLoading}
                aria-label={`Attendance for ${studentName} on ${formatDate(day.date)}`}
              >
                <option value="">—</option>
                {ATTENDANCE_STATUS_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            ) : (
              <span className="block py-1 text-center font-semibold">
                {attendanceLabel(status)}
              </span>
            )}
          </td>
        );
      })}
      <td className="sticky right-0 z-[1] min-w-[4.5rem] border-l bg-muted px-1 py-1.5 text-center font-semibold shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.12)] sm:min-w-[5.5rem] sm:px-2 sm:py-2">
        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 sm:text-xs">
          P: {present}
          {pastWeeks > 0 && (
            <span className="font-normal text-[10px]"> ({formatPercent(presentPct)})</span>
          )}
        </div>
        <div className="text-[10px] text-red-700 dark:text-red-400 sm:text-xs">
          A: {absent}
          {pastWeeks > 0 && (
            <span className="font-normal text-[10px]"> ({formatPercent(absentPct)})</span>
          )}
        </div>
      </td>
    </tr>
  );
});
