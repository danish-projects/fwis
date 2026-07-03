import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  getGradeAttendanceMatrix,
  getGradesForAttendanceSummary,
} from "@/actions/attendance";
import { getSessionUser, requirePermission } from "@/lib/auth/session";
import { AttendanceGradeMatrix } from "@/components/attendance/attendance-grade-matrix";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSelectedSchool } from "@/lib/school/resolve-school";

export const metadata = { title: "Grade Attendance Summary" };

type PageProps = {
  searchParams: Promise<{ grade?: string }>;
};

export default async function AttendanceSummaryPage({ searchParams }: PageProps) {
  await requirePermission("attendance:read");
  const user = await getSessionUser();
  const { grade: gradeParam } = await searchParams;

  const selectedSchool = user ? await getSelectedSchool(user) : null;
  if (!selectedSchool) notFound();

  const schoolId = selectedSchool.id;
  const grades = await getGradesForAttendanceSummary(schoolId);
  const gradeId =
    gradeParam && grades.some((g) => g.id === Number(gradeParam))
      ? Number(gradeParam)
      : grades[0]?.id;

  const matrix =
    gradeId !== undefined
      ? await getGradeAttendanceMatrix(schoolId, { gradeId })
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href="/attendance">← Back to attendance</Link>
          </Button>
          <h1 className="text-2xl font-bold md:text-3xl">Grade Attendance Summary</h1>
          <p className="text-muted-foreground">
            Matrix view by grade — {selectedSchool.name}
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
            schools={[selectedSchool]}
            grades={grades}
            showSchoolPicker={false}
          />
        </Suspense>
      )}
    </div>
  );
}
