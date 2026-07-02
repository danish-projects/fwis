"use client";

import { useRouter } from "next/navigation";
import { CalendarRange } from "lucide-react";
import type { StudentProfileYearOption } from "@/actions/student-profile";

type StudentProfileYearSelectProps = {
  studentId: string;
  years: StudentProfileYearOption[];
  selectedYearId: string | null;
};

export function StudentProfileYearSelect({
  studentId,
  years,
  selectedYearId,
}: StudentProfileYearSelectProps) {
  const router = useRouter();

  if (years.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <CalendarRange className="h-4 w-4 text-muted-foreground" />
      <label htmlFor="profile-year" className="text-sm text-muted-foreground">
        Academic Year
      </label>
      <select
        id="profile-year"
        value={selectedYearId ?? years[0]?.academicYearId ?? ""}
        onChange={(e) => {
          const year = e.target.value;
          router.push(
            year
              ? `/students/${studentId}/profile?year=${year}`
              : `/students/${studentId}/profile`
          );
        }}
        className="h-9 rounded-md border border-input bg-background px-2.5 text-sm"
      >
        {years.map((year) => (
          <option key={year.academicYearId} value={year.academicYearId}>
            {year.name}
          </option>
        ))}
      </select>
    </div>
  );
}
