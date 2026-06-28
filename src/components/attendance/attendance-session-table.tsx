"use client";

import { StudentNameWithGender } from "@/components/students/student-name-with-gender";
import { AttendanceStatus, BehaviorValue, type GenderCode } from "@/lib/setup-types";
import {
  ATTENDANCE_STATUS_OPTIONS,
  BEHAVIOR_DISPLAY_OPTIONS,
} from "@/lib/attendance/behavior-options";
import { cn } from "@/lib/utils";

export type SessionTableRecord = {
  enrollmentId: string;
  studentName: string;
  studentNumber: string | null;
  gender: GenderCode | string;
  behaviorScore: number;
  behaviorLevel: string;
  status: AttendanceStatus | null;
  behaviorValue?: BehaviorValue;
};

type AttendanceSessionTableProps = {
  records: SessionTableRecord[];
  onStatusChange: (enrollmentId: string, status: AttendanceStatus) => void;
  onBehaviorChange: (enrollmentId: string, value: BehaviorValue | undefined) => void;
};

export function AttendanceSessionTable({
  records,
  onStatusChange,
  onBehaviorChange,
}: AttendanceSessionTableProps) {
  if (records.length === 0) {
    return (
      <p className="rounded-lg border py-8 text-center text-sm text-muted-foreground">
        No active enrollments in this grade.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left">
            <th className="sticky left-0 z-10 bg-muted/95 px-3 py-2 font-medium">Student</th>
            <th className="px-3 py-2 font-medium">Attendance & Behavior</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.enrollmentId} className="border-b last:border-0 hover:bg-muted/30">
              <td className="sticky left-0 z-10 bg-background px-3 py-1.5 font-medium">
                <StudentNameWithGender
                  name={record.studentName}
                  gender={record.gender}
                  studentNumber={record.studentNumber}
                />
                <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                  Behavior: {record.behaviorScore}% · {record.behaviorLevel}
                </p>
              </td>
              <td className="px-3 py-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex gap-1">
                    {ATTENDANCE_STATUS_OPTIONS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => onStatusChange(record.enrollmentId, value)}
                        className={cn(
                          "h-8 w-8 rounded border text-xs font-bold",
                          record.status === value
                            ? value === "PRESENT"
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : value === "ABSENT"
                                ? "border-destructive bg-destructive text-white"
                                : "border-amber-500 bg-amber-500 text-white"
                            : "bg-background hover:bg-muted"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <select
                    className="h-8 min-w-[11rem] max-w-full rounded-md border border-input bg-background px-2 text-xs"
                    value={record.behaviorValue ?? ""}
                    onChange={(e) =>
                      onBehaviorChange(
                        record.enrollmentId,
                        (e.target.value || undefined) as BehaviorValue | undefined
                      )
                    }
                    aria-label={`Behavior for ${record.studentName}`}
                  >
                    <option value="">Behavior</option>
                    {BEHAVIOR_DISPLAY_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
