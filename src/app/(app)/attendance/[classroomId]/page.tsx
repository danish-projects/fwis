import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getAttendanceSession, getClassroomsForAttendance } from "@/actions/attendance";
import { requirePermission } from "@/lib/auth/session";
import { AttendanceEntry } from "@/components/attendance/attendance-entry";
import { Skeleton } from "@/components/ui/skeleton";

type PageProps = {
  params: Promise<{ classroomId: string }>;
  searchParams: Promise<{ day?: string }>;
};

export default async function AdminAttendanceClassPage({
  params,
  searchParams,
}: PageProps) {
  await requirePermission("attendance:read");
  const { classroomId } = await params;
  const { day } = await searchParams;

  const session = await getAttendanceSession(classroomId, day);
  if (!session) notFound();

  const classrooms = await getClassroomsForAttendance();
  const classroomOptions = classrooms.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <AttendanceEntry
        key={`${classroomId}-${session.selectedDay?.id ?? "none"}`}
        classroomId={classroomId}
        classroomName={session.classroom.name}
        calendarDays={session.calendarDays}
        selectedDay={session.selectedDay ?? null}
        enrollments={session.enrollments}
        backHref="/attendance"
        classroomOptions={classroomOptions}
        classroomSwitcherBasePath="/attendance"
      />
    </Suspense>
  );
}
