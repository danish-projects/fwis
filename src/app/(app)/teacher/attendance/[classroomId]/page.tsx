import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getAttendanceSession } from "@/actions/attendance";
import { requireRole } from "@/lib/auth/session";
import { getTeacherClassrooms } from "@/lib/auth/teacher-defaults";
import { AttendanceEntry } from "@/components/attendance/attendance-entry";
import { Skeleton } from "@/components/ui/skeleton";
import { filterClassroomsForSelectedSchool } from "@/lib/school/filter-classrooms";
import { getSelectedSchool } from "@/lib/school/resolve-school";

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

  const [session, teacherClassrooms, selectedSchool] = await Promise.all([
    getAttendanceSession(classroomId, day),
    getTeacherClassrooms(user),
    getSelectedSchool(user),
  ]);
  if (!session) notFound();

  if (selectedSchool && session.classroom.schoolId !== selectedSchool.id) {
    redirect("/dashboard/teacher");
  }

  if (!day && session.selectedDay?.id) {
    redirect(`/teacher/attendance/${classroomId}?day=${session.selectedDay.id}`);
  }

  const classroomOptions = filterClassroomsForSelectedSchool(
    teacherClassrooms,
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
        showBack={false}
        classroomOptions={classroomOptions}
        classroomSwitcherBasePath="/teacher/attendance"
      />
    </Suspense>
  );
}
