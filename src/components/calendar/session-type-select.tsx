"use client";

import { SESSION_TYPE_LABELS } from "@/lib/calendar/generate-sundays";
import type { SessionType } from "@/lib/setup-types";

export function SessionTypeSelect({
  name,
  defaultValue,
  value,
  onChange,
  id,
}: {
  name?: string;
  defaultValue?: SessionType;
  value?: SessionType;
  onChange?: (value: SessionType) => void;
  id?: string;
}) {
  return (
    <select
      id={id ?? name}
      name={name}
      {...(value !== undefined
        ? { value }
        : { defaultValue: defaultValue ?? "INSTRUCTIONAL" })}
      onChange={(e) => onChange?.(e.target.value as SessionType)}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
    >
      {Object.entries(SESSION_TYPE_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
