import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  getClassroomsForConsolidateAttendance,
  getGradeAttendanceMatrix,
  getSchoolsForAttendanceSummary,
} from "@/actions/attendance";
import {
  ALL_CLASSROOMS_VALUE,
  ConsolidateAttendanceMatrix,
} from "@/components/attendance/consolidate-attendance-matrix";
import { ConsolidateAttendancePageLayout } from "@/components/attendance/consolidate-attendance-page-layout";
import { getSessionUser, requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Consolidate Attendance" };

type PageProps = {
  searchParams: Promise<{ school?: string; classroom?: string }>;
};

function resolveClassroomFilter(
  classroomParam: string | undefined,
  classrooms: { id: string }[]
): string | typeof ALL_CLASSROOMS_VALUE {
  if (!classroomParam || classroomParam === ALL_CLASSROOMS_VALUE) {
    return ALL_CLASSROOMS_VALUE;
  }
  if (classrooms.some((c) => c.id === classroomParam)) return classroomParam;
  return ALL_CLASSROOMS_VALUE;
}

export default async function ConsolidateAttendancePage({ searchParams }: PageProps) {
  await requirePermission("attendance:read");
  const user = await getSessionUser();
  const { school: schoolParam, classroom: classroomParam } = await searchParams;

  const schools = await getSchoolsForAttendanceSummary();
  if (schools.length === 0) notFound();

  const schoolId = schoolParam && schools.some((s) => s.id === schoolParam)
    ? schoolParam
    : schools[0].id;

  const classrooms = await getClassroomsForConsolidateAttendance(schoolId);
  const classroomFilter = resolveClassroomFilter(classroomParam, classrooms);

  const matrix = await getGradeAttendanceMatrix(
    schoolId,
    classroomFilter === ALL_CLASSROOMS_VALUE
      ? {}
      : { classroomId: classroomFilter }
  );

  const showSchoolPicker = schools.length > 0;
  const canEdit = user !== null && hasPermission(user.roles, "attendance:update");

  return (
    <ConsolidateAttendancePageLayout
      title="Consolidate Attendance"
      description="Students × calendar dates — edit attendance across grades"
      backLink={
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 px-2">
          <Link href="/attendance">← Back to attendance</Link>
        </Button>
      }
    >
      {!matrix || matrix.calendarDays.length === 0 ? (
        <p className="rounded-lg border py-12 text-center text-muted-foreground">
          No calendar days found for the selected school and academic year.
        </p>
      ) : (
        <Suspense fallback={<Skeleton className="h-full min-h-[12rem] w-full" />}>
          <ConsolidateAttendanceMatrix
            key={`${schoolId}-${classroomFilter}`}
            basePath="/attendance/consolidate"
            schoolId={schoolId}
            classroomFilter={classroomFilter}
            calendarDays={matrix.calendarDays}
            students={matrix.students}
            schools={schools}
            classrooms={classrooms.map((c) => ({
              id: c.id,
              name: c.name,
            }))}
            showSchoolPicker={showSchoolPicker}
            canEdit={canEdit}
          />
        </Suspense>
      )}
    </ConsolidateAttendancePageLayout>
  );
}
