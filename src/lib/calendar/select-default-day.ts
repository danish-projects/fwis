/** Pick today's calendar day if it matches, otherwise the most recent day on or before today. */
export function selectDefaultCalendarDayId(
  calendarDays: { id: string; date: Date }[]
): string | undefined {
  if (calendarDays.length === 0) return undefined;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayMatch = calendarDays.find((d) => {
    const day = new Date(d.date);
    day.setHours(0, 0, 0, 0);
    return day.getTime() === today.getTime();
  });
  if (todayMatch) return todayMatch.id;

  const pastOrToday = calendarDays
    .filter((d) => {
      const day = new Date(d.date);
      day.setHours(0, 0, 0, 0);
      return day.getTime() <= today.getTime();
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return pastOrToday[0]?.id ?? calendarDays[calendarDays.length - 1]?.id;
}

export function formatSundayDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
