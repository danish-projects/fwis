"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AttendanceStatus, SessionType } from "@/lib/setup-types";
import {
  bulkUpsertAttendanceMatrix,
  type GradeAttendanceMatrixCell,
  type MatrixAttendanceRecord,
} from "@/actions/attendance";
import {
  isEditableAttendanceSessionType,
  SESSION_TYPE_HEADER_CLASSES,
} from "@/lib/attendance/session-type-styles";
import { SESSION_TYPE_LABELS } from "@/lib/calendar/generate-sundays";
import { ConsolidateMatrixRow } from "@/components/attendance/consolidate-matrix-row";
import { WeekColumnFilterSelect } from "@/components/attendance/week-column-filter-select";
import { MatrixExportButton } from "@/components/export/matrix-export-button";
import { useVirtualScroll } from "@/hooks/use-virtual-scroll";
import { Button } from "@/components/ui/button";
import { formatLessonPlanLabel } from "@/lib/calendar/lesson-plan";
import { formatDate } from "@/lib/utils";
import {
  getAttendanceWeekSummary,
  summarizeStudentAttendance,
} from "@/lib/attendance/consolidate-attendance-stats";
import {
  ALL_WEEKS_VALUE,
  filterCalendarDays,
  type WeekColumnFilter,
} from "@/lib/attendance/week-column-filter";

export const ALL_CLASSROOMS_VALUE = "all";
/** @deprecated Use ALL_CLASSROOMS_VALUE */
export const ALL_GRADES_VALUE = ALL_CLASSROOMS_VALUE;

/** Fixed row height for virtual scroll (name + ID + subline + cell padding). */
const MATRIX_ROW_HEIGHT = 62;

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
  gradeName: string;
  classroomName: string;
  cells: Record<string, GradeAttendanceMatrixCell>;
};

export type ConsolidateAttendanceMatrixProps = {
  basePath: string;
  schoolId: string;
  classroomFilter: string | typeof ALL_CLASSROOMS_VALUE;
  calendarDays: CalendarDay[];
  students: StudentRow[];
  schools: { id: string; name: string }[];
  classrooms: { id: string; name: string }[];
  showSchoolPicker: boolean;
  canEdit: boolean;
};

type MatrixCellState = {
  status: AttendanceStatus | null;
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
      });
    }
  }
  return map;
}

function matrixEqual(a: Map<string, MatrixCellState>, b: Map<string, MatrixCellState>) {
  if (a.size !== b.size) return false;
  for (const [key, value] of a) {
    const other = b.get(key);
    if (!other || value.status !== other.status) return false;
  }
  return true;
}

const UNSAVED_MESSAGE =
  "You have unsaved attendance changes. Leave without saving?";

export function ConsolidateAttendanceMatrix({
  basePath,
  schoolId,
  classroomFilter,
  calendarDays,
  students,
  schools,
  classrooms,
  showSchoolPicker,
  canEdit,
}: ConsolidateAttendanceMatrixProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const [isLoading, startLoadTransition] = useTransition();
  const [weekFilter, setWeekFilter] = useState<WeekColumnFilter>(ALL_WEEKS_VALUE);
  const showGradeColumn = classroomFilter === ALL_CLASSROOMS_VALUE;

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams({
      schoolId,
      classroom: classroomFilter,
    });
    return `/api/export/attendance-matrix?${params.toString()}`;
  }, [schoolId, classroomFilter]);

  const visibleCalendarDays = useMemo(
    () => filterCalendarDays(calendarDays, weekFilter),
    [calendarDays, weekFilter]
  );

  useEffect(() => {
    setWeekFilter(ALL_WEEKS_VALUE);
  }, [schoolId, classroomFilter, calendarDays.length]);

  const { startIndex, endIndex, paddingTop, paddingBottom } = useVirtualScroll(
    scrollRef,
    { itemCount: students.length, itemHeight: MATRIX_ROW_HEIGHT }
  );

  const visibleStudents = useMemo(
    () =>
      endIndex >= startIndex
        ? students.slice(startIndex, endIndex + 1)
        : [],
    [students, startIndex, endIndex]
  );

  const initialMatrix = useMemo(() => buildInitialMatrix(students), [students]);
  const baselineRef = useRef(initialMatrix);
  const [cells, setCells] = useState<Map<string, MatrixCellState>>(initialMatrix);

  const weekSummary = useMemo(
    () => getAttendanceWeekSummary(calendarDays),
    [calendarDays]
  );

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
    startLoadTransition(() => {
      router.push(`${basePath}?${params.toString()}`);
      router.refresh();
    });
  }

  function onSchoolChange(nextSchoolId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("school", nextSchoolId);
    params.delete("classroom");
    navigate(params);
  }

  function onClassroomChange(nextClassroom: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("school", schoolId);
    params.set("classroom", nextClassroom);
    navigate(params);
  }

  function updateCell(
    enrollmentId: string,
    dayId: string,
    status: AttendanceStatus | null
  ) {
    setCells((prev) => {
      const next = new Map(prev);
      next.set(cellKey(enrollmentId, dayId), { status });
      return next;
    });
  }

  const handleCellChange = useCallback(
    (enrollmentId: string, dayId: string, status: AttendanceStatus | null) => {
      updateCell(enrollmentId, dayId, status);
    },
    []
  );

  function handleSave() {
    const records: MatrixAttendanceRecord[] = [];

    for (const [key, value] of cells) {
      const baseline = baselineRef.current.get(key);
      if (baseline?.status === value.status || !value.status) continue;

      const [enrollmentId, calendarDayId] = key.split(":");
      const day = calendarDays.find((d) => d.id === calendarDayId);
      if (!day || !isEditableAttendanceSessionType(day.sessionType)) continue;

      records.push({
        enrollmentId,
        calendarDayId,
        status: value.status,
      });
    }

    if (records.length === 0) {
      toast.message("No changes to save");
      return;
    }

    startSaveTransition(async () => {
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
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {showSchoolPicker && (
          <div className="flex flex-col gap-1">
            <label htmlFor="consolidateSchool" className="text-sm font-medium">
              School
            </label>
            <select
              id="consolidateSchool"
              value={schoolId}
              onChange={(e) => onSchoolChange(e.target.value)}
              disabled={isLoading}
              className="h-10 min-w-[220px] rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
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
          <label htmlFor="consolidateClassroom" className="text-sm font-medium">
            Grade
          </label>
          <select
            id="consolidateClassroom"
            value={
              classroomFilter === ALL_CLASSROOMS_VALUE
                ? ALL_CLASSROOMS_VALUE
                : classroomFilter
            }
            onChange={(e) => onClassroomChange(e.target.value)}
            disabled={isLoading}
            className="h-10 min-w-[200px] rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
          >
            <option value={ALL_CLASSROOMS_VALUE}>All grades</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <WeekColumnFilterSelect
          weeks={calendarDays}
          value={weekFilter}
          onChange={setWeekFilter}
          id="consolidateWeek"
        />
        <MatrixExportButton
          exportUrl={exportUrl}
          disabled={students.length === 0 || isLoading}
        />
      </div>

      {isLoading && (
        <div
          className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          Loading attendance from database…
        </div>
      )}

      {isDirty && canEdit && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          Unsaved changes — save before leaving this page.
        </p>
      )}

      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <p className="text-sm text-muted-foreground">
          Weeks past:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {weekSummary.pastWeeks}/{weekSummary.totalWeeks}
          </span>
        </p>
        <div className="flex flex-wrap gap-2 text-[10px]">
          {(Object.keys(SESSION_TYPE_HEADER_CLASSES) as SessionType[]).map((type) => (
            <span
              key={type}
              className={`rounded px-2 py-0.5 font-medium ${SESSION_TYPE_HEADER_CLASSES[type]}`}
            >
              {SESSION_TYPE_LABELS[type]}
            </span>
          ))}
        </div>
      </div>

      {students.length === 0 ? (
        <p className="shrink-0 rounded-lg border py-8 text-center text-muted-foreground">
          No active students for the selected filters.
        </p>
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col rounded-lg border">
          {isLoading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-[1px]">
              <div className="flex flex-col items-center gap-2 text-primary">
                <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
                <span className="text-sm font-medium">Loading…</span>
              </div>
            </div>
          )}
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
            <table className="w-full max-w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-[4] min-w-[7.5rem] border-b border-r bg-muted px-2 py-2 text-left font-medium shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] sm:min-w-[10rem]">
                  Student
                </th>
                {visibleCalendarDays.map((day) => (
                  <th
                    key={day.id}
                    className={`sticky top-0 z-[3] min-w-[3.25rem] border-b px-0.5 py-1.5 text-center font-semibold sm:min-w-[4.5rem] sm:px-1 sm:py-2 ${SESSION_TYPE_HEADER_CLASSES[day.sessionType]}`}
                    title={SESSION_TYPE_LABELS[day.sessionType]}
                  >
                    <div className="text-[10px] sm:text-xs">
                      {formatLessonPlanLabel(day.lessonPlanNumber)}
                    </div>
                    <div className="text-[9px] font-normal opacity-90 sm:text-[10px]">
                      {formatDate(day.date)}
                    </div>
                  </th>
                ))}
                <th className="sticky right-0 top-0 z-[4] min-w-[4.5rem] border-b border-l bg-muted px-1 py-2 text-center font-semibold shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.15)] sm:min-w-[5.5rem] sm:px-2">
                  <div className="text-[10px] sm:text-xs">Total</div>
                  <div className="text-[9px] font-normal text-muted-foreground sm:text-[10px]">
                    P% / A%
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paddingTop > 0 && (
                <tr aria-hidden>
                  <td
                    colSpan={visibleCalendarDays.length + 2}
                    style={{ height: paddingTop, padding: 0, border: 0 }}
                  />
                </tr>
              )}
              {visibleStudents.map((student) => {
                // Totals always use every week (full year data), not the week filter.
                const totals = summarizeStudentAttendance(
                  calendarDays,
                  (dayId) =>
                    cells.get(cellKey(student.enrollmentId, dayId))?.status ?? null,
                  weekSummary.pastWeeks,
                  (day) =>
                    weekSummary.pastEditableDays.some(
                      (pastDay) => pastDay.id === day.id
                    )
                );

                return (
                  <ConsolidateMatrixRow
                    key={student.enrollmentId}
                    enrollmentId={student.enrollmentId}
                    studentName={student.studentName}
                    studentNumber={student.studentNumber}
                    gradeName={student.gradeName}
                    classroomName={student.classroomName}
                    showGradeColumn={showGradeColumn}
                    calendarDays={visibleCalendarDays}
                    getStatus={(dayId) =>
                      cells.get(cellKey(student.enrollmentId, dayId))?.status ??
                      null
                    }
                    present={totals.present}
                    absent={totals.absent}
                    presentPct={totals.presentPct}
                    absentPct={totals.absentPct}
                    pastWeeks={weekSummary.pastWeeks}
                    canEdit={canEdit}
                    isLoading={isLoading}
                    onCellChange={handleCellChange}
                  />
                );
              })}
              {paddingBottom > 0 && (
                <tr aria-hidden>
                  <td
                    colSpan={visibleCalendarDays.length + 2}
                    style={{ height: paddingBottom, padding: 0, border: 0 }}
                  />
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {canEdit && (
        <div className="shrink-0 border-t bg-background pt-3">
          <Button
            className="w-full"
            size="lg"
            onClick={handleSave}
            disabled={isSaving || isLoading || !isDirty}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              "Save Attendance"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
