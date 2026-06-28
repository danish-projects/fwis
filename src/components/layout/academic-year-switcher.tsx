"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { setSelectedAcademicYear } from "@/actions/academic-year";
import type { AcademicYearSummary } from "@/lib/academic-year/constants";
import { cn } from "@/lib/utils";

type AcademicYearSwitcherProps = {
  years: AcademicYearSummary[];
  selectedYearId: string | null;
  className?: string;
};

export function AcademicYearSwitcher({
  years,
  selectedYearId,
  className,
}: AcademicYearSwitcherProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (years.length === 0) return null;

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextId = event.target.value;
    if (!nextId || nextId === selectedYearId) return;

    startTransition(async () => {
      await setSelectedAcademicYear(nextId);
      router.refresh();
    });
  }

  return (
    <div className={cn("px-3 pb-3", className)}>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <CalendarRange className="h-3.5 w-3.5" />
        Academic Year
      </label>
      <select
        value={selectedYearId ?? years[0]?.id ?? ""}
        onChange={handleChange}
        disabled={pending}
        className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm disabled:opacity-60"
      >
        {years.map((year) => (
          <option key={year.id} value={year.id}>
            {year.label}
          </option>
        ))}
      </select>
    </div>
  );
}
