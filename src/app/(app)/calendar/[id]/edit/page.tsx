import { notFound } from "next/navigation";
import { getCalendarDayById } from "@/actions/calendar";
import { CalendarDayEditForm } from "@/components/calendar/calendar-day-edit-form";
import { requirePermission } from "@/lib/auth/session";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

export const metadata = { title: "Edit Calendar Day" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EditCalendarDayPage({ params }: PageProps) {
  await requirePermission("calendar:update");
  const { id } = await params;
  const day = await getCalendarDayById(id);
  if (!day) notFound();

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-xl space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <CalendarDayEditForm day={day} />
    </Suspense>
  );
}
