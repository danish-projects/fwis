"use client";

import { ALL_WEEKS_VALUE, type WeekColumnFilter } from "@/lib/attendance/week-column-filter";
import { formatLessonPlanLabel } from "@/lib/calendar/lesson-plan";
import { formatDate } from "@/lib/utils";

type WeekOption = {
  id: string;
  date: Date;
  lessonPlanNumber: number | null;
};

type WeekColumnFilterSelectProps = {
  weeks: WeekOption[];
  value: WeekColumnFilter;
  onChange: (value: WeekColumnFilter) => void;
  id?: string;
};

export function WeekColumnFilterSelect({
  weeks,
  value,
  onChange,
  id = "weekColumnFilter",
}: WeekColumnFilterSelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        Week
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm sm:min-w-[180px]"
      >
        <option value={ALL_WEEKS_VALUE}>All weeks</option>
        {weeks.map((week) => (
          <option key={week.id} value={week.id}>
            {formatLessonPlanLabel(week.lessonPlanNumber)} · {formatDate(week.date)}
          </option>
        ))}
      </select>
    </div>
  );
}
