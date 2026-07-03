"use client";

import {
  ASSESSMENT_COLUMN_FILTER_OPTIONS,
  type AssessmentColumnFilter,
} from "@/lib/assessments/assessment-column-filter";

type AssessmentColumnFilterSelectProps = {
  value: AssessmentColumnFilter;
  onChange: (value: AssessmentColumnFilter) => void;
  id?: string;
  label?: string;
  options?: Array<{ value: AssessmentColumnFilter; label: string }>;
};

export function AssessmentColumnFilterSelect({
  value,
  onChange,
  id = "assessmentColumnFilter",
  label = "Show column",
  options = ASSESSMENT_COLUMN_FILTER_OPTIONS,
}: AssessmentColumnFilterSelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) =>
          onChange(event.target.value as AssessmentColumnFilter)
        }
        className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm sm:min-w-[160px]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
