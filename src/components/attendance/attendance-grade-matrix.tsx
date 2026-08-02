"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { WeekColumnFilterSelect } from "@/components/attendance/week-column-filter-select";
import { AttendanceStatus, BehaviorValue, SessionType } from "@/lib/setup-types";
import {
  bulkUpsertAttendanceMatrix,
  type GradeAttendanceMatrixCell,
  type MatrixAttendanceRecord,
} from "@/actions/attendance";
import {
  ATTENDANCE_STATUS_OPTIONS,
  BEHAVIOR_DISPLAY_OPTIONS,
} from "@/lib/attendance/behavior-options";
import {
  isMarkableSessionType,
  SESSION_TYPE_HEADER_CLASSES,
} from "@/lib/attendance/session-type-styles";
import { SESSION_TYPE_LABELS } from "@/lib/calendar/generate-sundays";
import { formatLessonPlanLabel } from "@/lib/calendar/lesson-plan";
import {
  ALL_WEEKS_VALUE,
  filterCalendarDays,
  type WeekColumnFilter,
} from "@/lib/attendance/week-column-filter";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

type CalendarDay = {
  id: string;
  date: Date;
  lessonPlanNumber: number | null;
  sessionType: SessionType;
};

type StudentRow = {
  enrollmentId: string;
  studentName: string;
  studentNumber: string | null;
  classroomName: string;
  cells: Record<string, GradeAttendanceMatrixCell>;
};

type AttendanceGradeMatrixProps = {
  schoolId: string;
  gradeId: number;
  calendarDays: CalendarDay[];
  students: StudentRow[];
  schools: { id: string; name: string }[];
  grades: { id: number; name: string }[];
  showSchoolPicker: boolean;
};

type MatrixCellState = {
  status: AttendanceStatus | null;
  behaviorValue?: BehaviorValue;
};

function cellKey(enrollmentId: string, dayId: string) {
  return `${enrollmentId}:${dayId}`;
}

function buildInitialMatrix(students: StudentRow[]): Map<string, MatrixCellState> {
  const map = new Map<string, MatrixCellState>();
  for (const student of students) {
    for (const day of Object.keys(student.cells)) {
      const existing = student.cells[day];
      map.set(cellKey(student.enrollmentId, day), {
        status: existing?.status ?? null,
        behaviorValue: existing?.behaviorValue ?? undefined,
      });
    }
  }
  return map;
}

function matrixEqual(a: Map<string, MatrixCellState>, b: Map<string, MatrixCellState>) {
  if (a.size !== b.size) return false;
  for (const [key, value] of a) {
    const other = b.get(key);
    if (!other) return false;
    if (value.status !== other.status) return false;
    if (value.behaviorValue !== other.behaviorValue) return false;
  }
  return true;
}

const UNSAVED_MESSAGE =
  "You have unsaved attendance changes. Leave without saving?";

export function AttendanceGradeMatrix({
  schoolId,
  gradeId,
  calendarDays,
  students,
  schools,
  grades,
  showSchoolPicker,
}: AttendanceGradeMatrixProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [weekFilter, setWeekFilter] = useState<WeekColumnFilter>(ALL_WEEKS_VALUE);

  const visibleCalendarDays = useMemo(
    () => filterCalendarDays(calendarDays, weekFilter),
    [calendarDays, weekFilter]
  );

  useEffect(() => {
    setWeekFilter(ALL_WEEKS_VALUE);
  }, [schoolId, gradeId, calendarDays.length]);

  const initialMatrix = useMemo(() => buildInitialMatrix(students), [students]);
  const baselineRef = useRef(initialMatrix);
  const [cells, setCells] = useState<Map<string, MatrixCellState>>(initialMatrix);

  const isDirty = useMemo(
    () => !matrixEqual(cells, baselineRef.current),
    [cells]
  );

  useEffect(() => {
    baselineRef.current = initialMatrix;
    setCells(initialMatrix);
  }, [initialMatrix]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const confirmLeaveIfDirty = useCallback((): boolean => {
    if (!isDirty) return true;
    return window.confirm(UNSAVED_MESSAGE);
  }, [isDirty]);

  function navigate(params: URLSearchParams) {
    if (!confirmLeaveIfDirty()) return;
    router.push(`/attendance/summary?${params.toString()}`);
  }

  function onSchoolChange(nextSchoolId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("school", nextSchoolId);
    params.delete("grade");
    navigate(params);
  }

  function onGradeChange(nextGradeId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("school", schoolId);
    params.set("grade", nextGradeId);
    navigate(params);
  }

  function updateCell(
    enrollmentId: string,
    dayId: string,
    patch: Partial<MatrixCellState>
  ) {
    setCells((prev) => {
      const next = new Map(prev);
      const key = cellKey(enrollmentId, dayId);
      const current = next.get(key) ?? { status: null };
      next.set(key, { ...current, ...patch });
      return next;
    });
  }

  function handleSave() {
    const records: MatrixAttendanceRecord[] = [];

    for (const [key, value] of cells) {
      const baseline = baselineRef.current.get(key);
      const unchanged =
        baseline &&
        baseline.status === value.status &&
        baseline.behaviorValue === value.behaviorValue;
      if (unchanged || !value.status) continue;

      const [enrollmentId, calendarDayId] = key.split(":");
      const day = calendarDays.find((d) => d.id === calendarDayId);
      if (!day || !isMarkableSessionType(day.sessionType)) continue;

      if (!value.behaviorValue) {
        toast.error("Select a behavior rating for every attendance mark you save");
        return;
      }

      records.push({
        enrollmentId,
        calendarDayId,
        status: value.status,
        behaviorValue: value.behaviorValue,
      });
    }

    if (records.length === 0) {
      toast.message("No changes to save");
      return;
    }

    startTransition(async () => {
      try {
        const result = await bulkUpsertAttendanceMatrix(records);
        baselineRef.current = new Map(cells);
        toast.success(
          result.emailsSent > 0
            ? `Saved ${result.saved} record(s) · ${result.emailsSent} absence email(s) sent`
            : `Saved ${result.saved} attendance record(s)`
        );
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Save failed");
      }
    });
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {showSchoolPicker && (
          <div className="flex flex-col gap-1">
            <label htmlFor="summarySchool" className="text-sm font-medium">
              School
            </label>
            <select
              id="summarySchool"
              value={schoolId}
              onChange={(e) => onSchoolChange(e.target.value)}
              className="h-10 min-w-[200px] rounded-md border border-input bg-background px-3 text-sm"
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor="summaryGrade" className="text-sm font-medium">
            Grade
          </label>
          <select
            id="summaryGrade"
            value={gradeId}
            onChange={(e) => onGradeChange(e.target.value)}
            className="h-10 min-w-[160px] rounded-md border border-input bg-background px-3 text-sm"
          >
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <WeekColumnFilterSelect
          weeks={calendarDays}
          value={weekFilter}
          onChange={setWeekFilter}
          id="summaryWeek"
        />
      </div>

      {isDirty && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          Unsaved changes — save before leaving this page.
        </p>
      )}

      <div className="flex flex-wrap gap-2 text-[10px]">
        {(Object.keys(SESSION_TYPE_HEADER_CLASSES) as SessionType[]).map((type) => (
          <span
            key={type}
            className={`rounded px-2 py-0.5 ${SESSION_TYPE_HEADER_CLASSES[type]}`}
          >
            {SESSION_TYPE_LABELS[type]}
          </span>
        ))}
      </div>

      {students.length === 0 ? (
        <p className="rounded-lg border py-8 text-center text-muted-foreground">
          No active students in this grade.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full max-w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 min-w-[7.5rem] border-b border-r bg-muted px-2 py-2 text-left font-medium sm:min-w-[10rem]">
                  Student
                </th>
                {visibleCalendarDays.map((day) => (
                  <th
                    key={day.id}
                    className={`min-w-[3.25rem] border-b px-0.5 py-1.5 text-center font-medium sm:min-w-[4.5rem] sm:px-1 sm:py-2 ${SESSION_TYPE_HEADER_CLASSES[day.sessionType]}`}
                    title={SESSION_TYPE_LABELS[day.sessionType]}
                  >
                    <div className="text-[10px] sm:text-xs">
                      {formatLessonPlanLabel(day.lessonPlanNumber)}
                    </div>
                    <div className="text-[9px] font-normal opacity-80 sm:text-[10px]">
                      {formatDate(day.date)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.enrollmentId} className="border-b last:border-0">
                  <td className="sticky left-0 z-10 border-r bg-background px-2 py-1">
                    <div className="text-xs font-medium sm:text-sm">{student.studentName}</div>
                    {student.studentNumber ? (
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {student.studentNumber}
                      </div>
                    ) : null}
                    <div className="text-[10px] text-muted-foreground">
                      {student.classroomName}
                    </div>
                  </td>
                  {visibleCalendarDays.map((day) => {
                    const key = cellKey(student.enrollmentId, day.id);
                    const cell = cells.get(key) ?? { status: null };
                    const markable = isMarkableSessionType(day.sessionType);

                    if (!markable) {
                      return (
                        <td
                          key={day.id}
                          className={`px-1 py-1 text-center ${SESSION_TYPE_HEADER_CLASSES[day.sessionType]} opacity-60`}
                        >
                          <span className="text-muted-foreground">—</span>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={day.id}
                        className={`px-1 py-1 align-top ${SESSION_TYPE_HEADER_CLASSES[day.sessionType]} bg-opacity-30`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <select
                            className="h-7 w-full min-w-0 rounded border border-input bg-background px-0.5 text-center text-[10px] sm:text-[11px]"
                            value={cell.status ?? ""}
                            onChange={(e) =>
                              updateCell(student.enrollmentId, day.id, {
                                status: (e.target.value || null) as AttendanceStatus | null,
                              })
                            }
                          >
                            <option value="">—</option>
                            {ATTENDANCE_STATUS_OPTIONS.map(({ value, label }) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                          <select
                            className="h-7 w-full min-w-0 rounded border border-input bg-background px-0.5 text-center text-[10px] sm:text-[11px]"
                            value={cell.behaviorValue ?? ""}
                            onChange={(e) =>
                              updateCell(student.enrollmentId, day.id, {
                                behaviorValue: (e.target.value || undefined) as
                                  | BehaviorValue
                                  | undefined,
                              })
                            }
                          >
                            <option value="">—</option>
                            {BEHAVIOR_DISPLAY_OPTIONS.map(({ value, label }) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background p-4 lg:left-72">
        <div className="mx-auto flex max-w-3xl gap-3">
          <Button className="flex-1" size="lg" onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Bulk Save Attendance"}
          </Button>
        </div>
      </div>
    </div>
  );
}
