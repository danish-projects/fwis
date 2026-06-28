"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AttendanceStatus, BehaviorValue, type GenderCode } from "@/lib/setup-types";
import { bulkUpsertAttendance } from "@/actions/attendance";
import { SESSION_TYPE_LABELS } from "@/lib/calendar/generate-sundays";
import { formatLessonPlanLabel } from "@/lib/calendar/lesson-plan";
import { ClassroomSwitcher } from "@/components/teacher/teacher-class-switcher";
import {
  ClassroomContentLoadingOverlay,
  GradeChangeLoadingBanner,
} from "@/components/shared/grade-change-loading";
import { AttendanceSessionTable } from "@/components/attendance/attendance-session-table";
import { AttendanceSessionCards } from "@/components/attendance/attendance-session-cards";
import { BEHAVIOR_DISPLAY_OPTIONS } from "@/lib/attendance/behavior-options";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export type AttendanceViewMode = "preview" | "table";

const VIEW_OPTIONS: { value: AttendanceViewMode; label: string }[] = [
  { value: "preview", label: "Preview (cards)" },
  { value: "table", label: "Table" },
];

type ClassroomOption = {
  id: string;
  name: string;
};

type ClassroomSwitcherBasePath =
  | "/teacher/attendance"
  | "/teacher/assessments"
  | "/attendance"
  | "/assessments";

type CalendarDay = {
  id: string;
  date: Date;
  lessonPlanNumber: number | null;
  sessionType: keyof typeof SESSION_TYPE_LABELS;
};

type EnrollmentRow = {
  enrollmentId: string;
  studentName: string;
  studentNumber: string | null;
  gender: GenderCode | string;
  behaviorScore: number;
  behaviorLevel: string;
  existing: {
    status: AttendanceStatus;
    behaviorValue: BehaviorValue | null;
    behaviorComments: string | null;
    teacherComments: string | null;
  } | null;
};

type AttendanceEntryProps = {
  classroomId: string;
  classroomName: string;
  calendarDays: CalendarDay[];
  selectedDay: CalendarDay | null;
  enrollments: EnrollmentRow[];
  backHref?: string;
  showBack?: boolean;
  classroomOptions?: ClassroomOption[];
  classroomSwitcherBasePath?: ClassroomSwitcherBasePath;
  defaultView?: AttendanceViewMode;
};

type LocalRecord = {
  enrollmentId: string;
  studentName: string;
  studentNumber: string | null;
  gender: GenderCode | string;
  behaviorScore: number;
  behaviorLevel: string;
  status: AttendanceStatus | null;
  behaviorValue?: BehaviorValue;
  behaviorComments?: string;
};

function buildRecordsFromEnrollments(enrollments: EnrollmentRow[]): LocalRecord[] {
  return enrollments.map((e) => ({
    enrollmentId: e.enrollmentId,
    studentName: e.studentName,
    studentNumber: e.studentNumber,
    gender: e.gender,
    behaviorScore: e.behaviorScore,
    behaviorLevel: e.behaviorLevel,
    status: e.existing?.status ?? null,
    behaviorValue: e.existing?.behaviorValue ?? undefined,
    behaviorComments: e.existing?.behaviorComments ?? undefined,
  }));
}

function recordsEqual(a: LocalRecord[], b: LocalRecord[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((record, index) => {
    const other = b[index];
    return (
      record.enrollmentId === other.enrollmentId &&
      record.status === other.status &&
      record.behaviorValue === other.behaviorValue &&
      (record.behaviorComments ?? "") === (other.behaviorComments ?? "")
    );
  });
}

function parseViewMode(value: string | null | undefined): AttendanceViewMode {
  return value === "table" ? "table" : "preview";
}

const UNSAVED_MESSAGE =
  "You have unsaved attendance changes. Leave without saving?";

export function AttendanceEntry({
  classroomId,
  classroomName,
  calendarDays,
  selectedDay: initialDay,
  enrollments,
  backHref = "/teacher/attendance",
  showBack = true,
  classroomOptions = [],
  classroomSwitcherBasePath,
  defaultView = "preview",
}: AttendanceEntryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedDayId, setSelectedDayId] = useState(initialDay?.id ?? "");
  const [isSaving, startSaveTransition] = useTransition();
  const [isGradeLoading, setIsGradeLoading] = useState(false);
  const [viewMode, setViewMode] = useState<AttendanceViewMode>(() =>
    parseViewMode(searchParams.get("view") ?? defaultView)
  );
  const [bulkBehavior, setBulkBehavior] = useState<BehaviorValue | "">("");

  const initialRecords = useMemo(
    () => buildRecordsFromEnrollments(enrollments),
    [enrollments]
  );
  const baselineRef = useRef(initialRecords);
  const [records, setRecords] = useState<LocalRecord[]>(initialRecords);

  const isDirty = useMemo(
    () => !recordsEqual(records, baselineRef.current),
    [records]
  );

  const confirmLeaveIfDirty = useCallback((): boolean => {
    if (!isDirty) return true;
    return window.confirm(UNSAVED_MESSAGE);
  }, [isDirty]);

  useEffect(() => {
    baselineRef.current = initialRecords;
    setRecords(initialRecords);
    setBulkBehavior("");
  }, [initialRecords]);

  useEffect(() => {
    setViewMode(parseViewMode(searchParams.get("view") ?? defaultView));
  }, [searchParams, defaultView]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function onViewChange(nextView: AttendanceViewMode) {
    if (nextView === viewMode) return;
    setViewMode(nextView);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", nextView);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function onDayChange(dayId: string) {
    if (dayId === selectedDayId) return;
    if (!confirmLeaveIfDirty()) return;

    setSelectedDayId(dayId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("day", dayId);
    router.push(`?${params.toString()}`);
  }

  function setStatus(enrollmentId: string, status: AttendanceStatus) {
    setRecords((prev) =>
      prev.map((r) => (r.enrollmentId === enrollmentId ? { ...r, status } : r))
    );
  }

  function markAllPresent() {
    setRecords((prev) => prev.map((r) => ({ ...r, status: "PRESENT" as const })));
  }

  function setBehavior(enrollmentId: string, behaviorValue: BehaviorValue | undefined) {
    setRecords((prev) =>
      prev.map((r) => (r.enrollmentId === enrollmentId ? { ...r, behaviorValue } : r))
    );
  }

  function applyBulkBehavior() {
    if (!bulkBehavior) {
      toast.error("Select a behavior rating first");
      return;
    }
    if (records.length === 0) {
      toast.error("No students to update");
      return;
    }

    setRecords((prev) =>
      prev.map((record) => ({ ...record, behaviorValue: bulkBehavior }))
    );
    toast.success(`Applied behavior to ${records.length} student(s)`);
  }

  function handleSave() {
    if (!selectedDayId) {
      toast.error("Select a calendar day");
      return;
    }

    const unmarked = records.filter((r) => !r.status);
    if (unmarked.length > 0) {
      toast.error(`Mark attendance for all students (${unmarked.length} unmarked)`);
      return;
    }

    startSaveTransition(async () => {
      try {
        const result = await bulkUpsertAttendance(
          selectedDayId,
          records.map((r) => ({
            enrollmentId: r.enrollmentId,
            status: r.status!,
            behaviorValue: r.behaviorValue,
            behaviorComments: r.behaviorComments,
          }))
        );
        baselineRef.current = records;
        toast.success(
          result.emailsSent > 0
            ? `Attendance saved · ${result.emailsSent} absence email(s) sent`
            : "Attendance saved"
        );
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Save failed");
      }
    });
  }

  const selectedDay = calendarDays.find((d) => d.id === selectedDayId) ?? initialDay;
  const unmarkedCount = records.filter((r) => !r.status).length;

  const viewProps = {
    records,
    onStatusChange: setStatus,
    onBehaviorChange: setBehavior,
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {showBack && (
            <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
              <Link
                href={backHref}
                onClick={(event) => {
                  if (!confirmLeaveIfDirty()) event.preventDefault();
                }}
              >
                ← Back
              </Link>
            </Button>
          )}
          <h1 className="text-xl font-bold md:text-2xl">{classroomName}</h1>
          <p className="text-sm text-muted-foreground">Mark attendance for a Sunday session</p>
        </div>
        <Button variant="secondary" onClick={markAllPresent}>
          Mark All Present
        </Button>
      </div>

      {isDirty && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          Unsaved changes — save before leaving this page.
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {classroomOptions.length > 0 && classroomSwitcherBasePath && (
          <ClassroomSwitcher
            classrooms={classroomOptions}
            currentClassroomId={classroomId}
            basePath={classroomSwitcherBasePath}
            dayQuery={selectedDayId || undefined}
            onBeforeNavigate={confirmLeaveIfDirty}
            onPendingChange={setIsGradeLoading}
          />
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="calendarDay" className="text-sm font-medium">
            Session Date
          </label>
          <select
            id="calendarDay"
            value={selectedDayId}
            onChange={(e) => onDayChange(e.target.value)}
            disabled={isGradeLoading}
            className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm sm:max-w-md"
          >
            {calendarDays.map((d) => (
              <option key={d.id} value={d.id}>
                {formatLessonPlanLabel(d.lessonPlanNumber)} — {formatDate(d.date)} —{" "}
                {SESSION_TYPE_LABELS[d.sessionType]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="attendanceView" className="text-sm font-medium">
            View
          </label>
          <select
            id="attendanceView"
            value={viewMode}
            onChange={(e) => onViewChange(e.target.value as AttendanceViewMode)}
            className="h-10 min-w-[180px] rounded-md border border-input bg-background px-3 text-sm"
          >
            {VIEW_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isGradeLoading && <GradeChangeLoadingBanner />}

      {selectedDay && (
        <p className="text-sm text-muted-foreground">
          {SESSION_TYPE_LABELS[selectedDay.sessionType]} · Attendance counts toward grade %
          (Tardy = Present)
          {unmarkedCount > 0 && ` · ${unmarkedCount} student(s) not marked yet`}
        </p>
      )}

      {records.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-end sm:gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="bulkBehavior" className="text-sm font-medium">
              Apply behavior to all students
            </label>
            <select
              id="bulkBehavior"
              value={bulkBehavior}
              onChange={(e) =>
                setBulkBehavior((e.target.value || "") as BehaviorValue | "")
              }
              disabled={isGradeLoading}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-md"
            >
              <option value="">Select behavior rating</option>
              {BEHAVIOR_DISPLAY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={applyBulkBehavior}
            disabled={isGradeLoading || !bulkBehavior}
            className="sm:mb-0"
          >
            Apply
          </Button>
        </div>
      )}

      <div className="relative">
        {isGradeLoading && <ClassroomContentLoadingOverlay />}

        {viewMode === "table" ? (
          <AttendanceSessionTable {...viewProps} />
        ) : (
          <AttendanceSessionCards {...viewProps} />
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background p-4 lg:left-72">
        <div className="mx-auto flex max-w-3xl gap-3">
          <Button className="flex-1" size="lg" onClick={handleSave} disabled={isSaving || isGradeLoading}>
            {isSaving ? "Saving..." : "Save Attendance"}
          </Button>
        </div>
      </div>
    </div>
  );
}
