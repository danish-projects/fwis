"use client";

import { AttendanceStatus, BehaviorValue } from "@/lib/setup-types";
import {
  ATTENDANCE_STATUS_OPTIONS,
  BEHAVIOR_DISPLAY_OPTIONS,
} from "@/lib/attendance/behavior-options";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SessionTableRecord } from "@/components/attendance/attendance-session-table";
import { StudentNameWithGender } from "@/components/students/student-name-with-gender";

type AttendanceSessionCardsProps = {
  records: SessionTableRecord[];
  onStatusChange: (enrollmentId: string, status: AttendanceStatus) => void;
  onBehaviorChange: (enrollmentId: string, value: BehaviorValue | undefined) => void;
};

export function AttendanceSessionCards({
  records,
  onStatusChange,
  onBehaviorChange,
}: AttendanceSessionCardsProps) {
  if (records.length === 0) {
    return (
      <p className="rounded-lg border py-8 text-center text-sm text-muted-foreground">
        No active enrollments in this grade.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {records.map((record) => (
        <Card key={record.enrollmentId}>
          <CardContent className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <StudentNameWithGender
                name={record.studentName}
                gender={record.gender}
                studentNumber={record.studentNumber}
                className="font-medium"
              />
              <p className="text-xs text-muted-foreground">
                Behavior: {record.behaviorScore}% · {record.behaviorLevel}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1">
                {ATTENDANCE_STATUS_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onStatusChange(record.enrollmentId, value)}
                    className={cn(
                      "h-9 w-9 rounded-lg border text-sm font-bold",
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
                className="h-9 min-w-[11rem] max-w-full rounded-md border border-input bg-background px-2 text-xs"
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
