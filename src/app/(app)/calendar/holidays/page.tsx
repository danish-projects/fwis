import { redirect } from "next/navigation";
import { getCalendarPageContext } from "@/actions/calendar";
import { CalendarHolidaysClient } from "@/components/calendar/calendar-holidays-client";
import { requirePermission } from "@/lib/auth/session";

export const metadata = { title: "Add Holidays" };

export default async function CalendarHolidaysPage() {
  await requirePermission("calendar:create");

  const ctx = await getCalendarPageContext();
  if (!ctx.academicYearId || !ctx.startDate || !ctx.endDate) {
    redirect("/calendar");
  }

  return (
    <CalendarHolidaysClient
      academicYearId={ctx.academicYearId}
      academicYearName={ctx.academicYearName ?? "Academic year"}
      startDate={ctx.startDate}
      endDate={ctx.endDate}
      initialHolidays={ctx.holidays}
    />
  );
}
