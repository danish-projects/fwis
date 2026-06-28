"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useTransition } from "react";
import { Loader2 } from "lucide-react";

type ClassroomOption = {
  id: string;
  name: string;
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

    if (basePath.includes("/assessments")) {
      const year = searchParams.get("year");
      if (year) params.set("year", year);
    }

    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }

  function onChange(classroomId: string) {
    if (classroomId === currentClassroomId) return;
    if (onBeforeNavigate && !onBeforeNavigate()) return;
    startTransition(() => {
      router.push(`${basePath}/${classroomId}${buildQueryString()}`);
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label htmlFor="classSwitcher" className="text-sm font-medium">
        Grade
      </label>
      <div className="relative flex flex-1 items-center sm:max-w-md">
        <select
          id="classSwitcher"
          value={currentClassroomId}
          onChange={(e) => onChange(e.target.value)}
          disabled={isPending}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
        >
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {isPending && (
          <Loader2
            className="pointer-events-none absolute right-2 h-4 w-4 animate-spin text-primary"
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}

/** @deprecated Use ClassroomSwitcher */
export const TeacherClassSwitcher = ClassroomSwitcher;
