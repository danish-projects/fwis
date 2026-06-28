import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  getGradeAttendanceMatrix,
  getGradesForAttendanceSummary,
  getSchoolsForAttendanceSummary,
} from "@/actions/attendance";
import { getSessionUser, requirePermission } from "@/lib/auth/session";
import { getPrimaryRole } from "@/lib/auth/permissions";
import { AttendanceGradeMatrix } from "@/components/attendance/attendance-grade-matrix";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Grade Attendance Summary" };

type PageProps = {
  searchParams: Promise<{ school?: string; grade?: string }>;
};

export default async function AttendanceSummaryPage({ searchParams }: PageProps) {
  await requirePermission("attendance:read");
  const user = await getSessionUser();
  const { school: schoolParam, grade: gradeParam } = await searchParams;

  const schools = await getSchoolsForAttendanceSummary();
  if (schools.length === 0) notFound();

  const schoolId = schoolParam && schools.some((s) => s.id === schoolParam)
    ? schoolParam
    : schools[0].id;

  const grades = await getGradesForAttendanceSummary(schoolId);
  const gradeId =
    gradeParam && grades.some((g) => g.id === Number(gradeParam))
      ? Number(gradeParam)
      : grades[0]?.id;

  const matrix =
    gradeId !== undefined
      ? await getGradeAttendanceMatrix(schoolId, { gradeId })
      : null;

  const showSchoolPicker =
    user !== null && getPrimaryRole(user.roles) === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href="/attendance">← Back to attendance</Link>
          </Button>
          <h1 className="text-2xl font-bold md:text-3xl">Grade Attendance Summary</h1>
          <p className="text-muted-foreground">
            Matrix view by grade — students × calendar days
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/attendance">Grade entry</Link>
        </Button>
      </div>

      {!gradeId || !matrix ? (
        <p className="rounded-lg border py-12 text-center text-muted-foreground">
          No grades with active enrollments for this school.
        </p>
      ) : (
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <AttendanceGradeMatrix
            key={`${schoolId}-${gradeId}`}
            schoolId={schoolId}
            gradeId={gradeId}
            calendarDays={matrix.calendarDays}
            students={matrix.students}
            schools={schools}
            grades={grades}
            showSchoolPicker={showSchoolPicker}
          />
        </Suspense>
      )}
    </div>
  );
}
