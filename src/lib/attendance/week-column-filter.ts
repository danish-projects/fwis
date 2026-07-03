export const ALL_WEEKS_VALUE = "all" as const;

export type WeekColumnFilter = typeof ALL_WEEKS_VALUE | string;

export function filterCalendarDays<T extends { id: string }>(
  days: T[],
  filter: WeekColumnFilter
): T[] {
  if (filter === ALL_WEEKS_VALUE) return days;
  return days.filter((day) => day.id === filter);
}
