import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a calendar/date-only value for display.
 * Uses UTC so DB dates stored as midnight UTC (e.g. 2025-10-05T00:00:00.000Z)
 * keep the intended calendar day. School “today” logic uses America/Chicago
 * (see SCHOOL_TIMEZONE / calendar-date.ts), not this formatter.
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Format audit / timestamp values stored as school wall-clock in TIMESTAMP
 * WITHOUT TIME ZONE (UTC components = Central clock face).
 */
export function formatSchoolDateTime(
  date: Date | string | null | undefined
): string {
  if (!date) return "—";
  const formatted = new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
  return `${formatted} CT`;
}

export function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `${num.toFixed(1)}%`;
}
