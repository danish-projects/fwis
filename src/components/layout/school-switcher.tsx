"use client";

import { useEffect, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, School } from "lucide-react";
import { setSelectedSchool } from "@/actions/school-selection";
import type { SchoolSummary } from "@/lib/school/constants";
import { formatSchoolCityLabel } from "@/lib/school/format-school-code";
import { cn } from "@/lib/utils";

type SchoolSwitcherProps = {
  schools: SchoolSummary[];
  selectedSchoolId: string | null;
  className?: string;
  onPendingChange?: (pending: boolean) => void;
};

/** Classroom detail routes that should return to their list when school changes. */
const CLASSROOM_DETAIL_REDIRECTS: Array<{ pattern: RegExp; listPath: string }> = [
  { pattern: /^\/assessments\/[^/]+$/, listPath: "/assessments" },
  { pattern: /^\/attendance\/[^/]+$/, listPath: "/attendance" },
  { pattern: /^\/transcript\/[^/]+$/, listPath: "/transcript" },
  { pattern: /^\/teacher\/assessments\/[^/]+$/, listPath: "/teacher/assessments" },
  { pattern: /^\/teacher\/attendance\/[^/]+$/, listPath: "/teacher/attendance" },
  { pattern: /^\/teacher\/transcript\/[^/]+$/, listPath: "/teacher/transcript" },
];

export function SchoolSwitcher({
  schools,
  selectedSchoolId,
  className,
  onPendingChange,
}: SchoolSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);

  if (schools.length === 0) return null;

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextId = event.target.value;
    if (!nextId || nextId === selectedSchoolId) return;

    startTransition(async () => {
      await setSelectedSchool(nextId);

      const redirect = CLASSROOM_DETAIL_REDIRECTS.find((entry) =>
        entry.pattern.test(pathname)
      );
      if (redirect) {
        router.push(redirect.listPath);
      } else {
        router.refresh();
      }
    });
  }

  if (schools.length === 1) {
    return (
      <div className={cn("px-3 pb-3", className)}>
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <School className="h-3.5 w-3.5" />
          School
        </p>
        <p className="text-sm font-semibold leading-snug">
          {formatSchoolCityLabel(schools[0])}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("px-3 pb-3", className)}>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <School className="h-3.5 w-3.5" />
        School
        {pending && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />
        )}
      </label>
      <div className="relative">
        <select
          value={selectedSchoolId ?? schools[0]?.id ?? ""}
          onChange={handleChange}
          disabled={pending}
          aria-busy={pending}
          className="h-9 w-full rounded-md border border-input bg-background px-2.5 pr-8 text-sm disabled:opacity-60"
        >
          {schools.map((school) => (
            <option key={school.id} value={school.id}>
              {formatSchoolCityLabel(school)}
            </option>
          ))}
        </select>
        {pending && (
          <Loader2
            className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary"
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
