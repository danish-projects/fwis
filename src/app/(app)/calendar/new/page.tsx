import { notFound, redirect } from "next/navigation";
import { getCalendarDays, getCalendarPageContext } from "@/actions/calendar";
import { CalendarDayCreateForm } from "@/components/calendar/calendar-day-create-form";
import { requirePermission } from "@/lib/auth/session";
import { calendarDateKey } from "@/lib/calendar/calendar-date";

export const metadata = { title: "Add Calendar Day" };

export default async function NewCalendarDayPage() {
  await requirePermission("calendar:create");

  const ctx = await getCalendarPageContext();
  if (!ctx.academicYearId) {
    redirect("/calendar");
  }

  const yearData = await getCalendarDays(ctx.academicYearId);
  if (!yearData) notFound();

  return (
    <CalendarDayCreateForm
      academicYearSchoolId={yearData.academicYearSchoolId}
      academicYearName={yearData.name}
      schoolName={yearData.school.name}
      startDate={calendarDateKey(yearData.startDate)}
      endDate={calendarDateKey(yearData.endDate)}
      calendarHref="/calendar"
    />
  );
}
