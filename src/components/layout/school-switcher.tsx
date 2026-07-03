"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { School } from "lucide-react";
import { setSelectedSchool } from "@/actions/school-selection";
import type { SchoolSummary } from "@/lib/school/constants";
import { cn } from "@/lib/utils";

type SchoolSwitcherProps = {
  schools: SchoolSummary[];
  selectedSchoolId: string | null;
  className?: string;
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
}: SchoolSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

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
        <p className="text-sm font-semibold leading-snug">{schools[0].name}</p>
      </div>
    );
  }

  return (
    <div className={cn("px-3 pb-3", className)}>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <School className="h-3.5 w-3.5" />
        School
      </label>
      <select
        value={selectedSchoolId ?? schools[0]?.id ?? ""}
        onChange={handleChange}
        disabled={pending}
        className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm disabled:opacity-60"
      >
        {schools.map((school) => (
          <option key={school.id} value={school.id}>
            {school.name}
          </option>
        ))}
      </select>
    </div>
  );
}
