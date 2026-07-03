"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { formatClassroomSwitcherOptions } from "@/lib/classrooms/format-classroom-options";

type ClassroomOption = {
  id: string;
  name: string;
  schoolId: string;
  school: { name: string };
  grade?: { name: string; sortOrder?: number } | null;
  section?: { name: string } | null;
};

type ClassroomSwitcherBasePath =
  | "/teacher/attendance"
  | "/teacher/assessments"
  | "/teacher/transcript"
  | "/attendance"
  | "/assessments"
  | "/transcript";

type ClassroomSwitcherProps = {
  classrooms: ClassroomOption[];
  currentClassroomId: string;
  basePath: ClassroomSwitcherBasePath;
  /** Attendance: preferred day to keep when switching classes */
  dayQuery?: string;
  onBeforeNavigate?: () => boolean;
  onPendingChange?: (pending: boolean) => void;
};

export function ClassroomSwitcher({
  classrooms,
  currentClassroomId,
  basePath,
  dayQuery,
  onBeforeNavigate,
  onPendingChange,
}: ClassroomSwitcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const gradeOptions = useMemo(
    () =>
      formatClassroomSwitcherOptions(classrooms, {
        includeSchoolName: false,
      }),
    [classrooms]
  );

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  if (classrooms.length === 0) return null;

  function buildQueryString(): string {
    const params = new URLSearchParams();

    if (basePath.includes("/attendance")) {
      const day = dayQuery ?? searchParams.get("day");
      if (day) params.set("day", day);
      const view = searchParams.get("view");
      if (view) params.set("view", view);
    }

    if (basePath.includes("/assessments") || basePath.includes("/transcript")) {
      const year = searchParams.get("year");
      if (year) params.set("year", year);
    }

    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }

  function navigateToClassroom(classroomId: string) {
    if (classroomId === currentClassroomId) return;
    if (onBeforeNavigate && !onBeforeNavigate()) return;
    startTransition(() => {
      router.push(`${basePath}/${classroomId}${buildQueryString()}`);
    });
  }

  return (
    <div className="flex min-w-0 items-center gap-2 sm:max-w-md">
      <label htmlFor="classSwitcher" className="shrink-0 text-sm font-medium">
        Grade
      </label>
      <div className="relative min-w-0 flex-1">
        <select
          id="classSwitcher"
          value={currentClassroomId}
          onChange={(e) => navigateToClassroom(e.target.value)}
          disabled={isPending}
          className="h-10 w-full rounded-md border border-input bg-background px-3 pr-8 text-sm disabled:opacity-60"
        >
          {gradeOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {isPending && (
          <Loader2
            className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary"
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}

/** @deprecated Use ClassroomSwitcher */
export const TeacherClassSwitcher = ClassroomSwitcher;
