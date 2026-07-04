import { notFound, redirect } from "next/navigation";
import { getCalendarDays } from "@/actions/calendar";
import { CalendarDayCreateForm } from "@/components/calendar/calendar-day-create-form";
import { requirePermission } from "@/lib/auth/session";
import { calendarDateKey } from "@/lib/calendar/calendar-date";

export const metadata = { title: "Add Calendar Day" };

type PageProps = {
  searchParams: Promise<{ year?: string }>;
};

export default async function NewCalendarDayPage({ searchParams }: PageProps) {
  await requirePermission("calendar:create");
  const { year: academicYearId } = await searchParams;

  if (!academicYearId) {
    redirect("/calendar");
  }

  const yearData = await getCalendarDays(academicYearId);
  if (!yearData) notFound();

  const calendarHref = `/calendar?year=${yearData.id}`;

  return (
    <CalendarDayCreateForm
      academicYearId={yearData.id}
      academicYearName={yearData.name}
      schoolName={yearData.school.name}
      startDate={calendarDateKey(yearData.startDate)}
      endDate={calendarDateKey(yearData.endDate)}
      calendarHref={calendarHref}
    />
  );
}
