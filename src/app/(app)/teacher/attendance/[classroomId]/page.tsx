import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getAttendanceSession } from "@/actions/attendance";
import { requireRole } from "@/lib/auth/session";
import { getTeacherClassrooms } from "@/lib/auth/teacher-defaults";
import { AttendanceEntry } from "@/components/attendance/attendance-entry";
import { Skeleton } from "@/components/ui/skeleton";

type PageProps = {
  params: Promise<{ classroomId: string }>;
  searchParams: Promise<{ day?: string }>;
};

export default async function TeacherAttendanceClassPage({
  params,
  searchParams,
}: PageProps) {
  const user = await requireRole("TEACHER");
  const { classroomId } = await params;
  const { day } = await searchParams;

  const session = await getAttendanceSession(classroomId, day);
  if (!session) notFound();

  if (!day && session.selectedDay?.id) {
    redirect(`/teacher/attendance/${classroomId}?day=${session.selectedDay.id}`);
  }

  const teacherClassrooms = await getTeacherClassrooms(user);

  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <AttendanceEntry
        key={`${classroomId}-${session.selectedDay?.id ?? "none"}`}
        classroomId={classroomId}
        classroomName={session.classroom.name}
        calendarDays={session.calendarDays}
        selectedDay={session.selectedDay ?? null}
        enrollments={session.enrollments}
        showBack={false}
        classroomOptions={teacherClassrooms.map((c) => ({
          id: c.id,
          name: c.name,
        }))}
        classroomSwitcherBasePath="/teacher/attendance"
      />
    </Suspense>
  );
}
