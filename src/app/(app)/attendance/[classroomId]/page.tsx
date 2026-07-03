import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getAttendanceSession, getClassroomsForAttendance } from "@/actions/attendance";
import { getSessionUser, requirePermission } from "@/lib/auth/session";
import { AttendanceEntry } from "@/components/attendance/attendance-entry";
import { Skeleton } from "@/components/ui/skeleton";
import { filterClassroomsForSelectedSchool } from "@/lib/school/filter-classrooms";
import { getSelectedSchool } from "@/lib/school/resolve-school";

type PageProps = {
  params: Promise<{ classroomId: string }>;
  searchParams: Promise<{ day?: string }>;
};

export default async function AdminAttendanceClassPage({
  params,
  searchParams,
}: PageProps) {
  await requirePermission("attendance:read");
  const user = await getSessionUser();
  const { classroomId } = await params;
  const { day } = await searchParams;

  const [session, classrooms, selectedSchool] = await Promise.all([
    getAttendanceSession(classroomId, day),
    getClassroomsForAttendance(),
    user ? getSelectedSchool(user) : null,
  ]);
  if (!session) notFound();

  if (selectedSchool && session.classroom.schoolId !== selectedSchool.id) {
    redirect("/attendance");
  }

  const classroomOptions = filterClassroomsForSelectedSchool(
    classrooms,
    selectedSchool
  ).map((c) => ({
    id: c.id,
    name: c.name,
    schoolId: c.schoolId,
    school: c.school,
    grade: c.grade,
    section: c.section,
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
