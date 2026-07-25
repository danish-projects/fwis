import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getAssessmentMatrix } from "@/actions/assessments";
import { assertClassroomAccess } from "@/lib/auth/enrollment-access";
import { requireRole } from "@/lib/auth/session";
import { getTeacherClassrooms } from "@/lib/auth/teacher-defaults";
import { AssessmentMatrix } from "@/components/assessments/assessment-matrix";
import { AssessmentsClassroomContent } from "@/components/assessments/assessments-classroom-content";
import { ClassroomEntryLoading } from "@/components/shared/grade-change-loading";
import { Button } from "@/components/ui/button";
import { parseAssessmentColumnFilter } from "@/lib/assessments/assessment-column-filter";
import { filterClassroomsForSelectedSchool } from "@/lib/school/filter-classrooms";
import { getSelectedSchool } from "@/lib/school/resolve-school";

export const metadata = { title: "Assessment Scores" };

type PageProps = {
  params: Promise<{ classroomId: string }>;
  searchParams: Promise<{ year?: string; column?: string }>;
};

export default async function TeacherAssessmentsClassPage({
  params,
  searchParams,
}: PageProps) {
  const user = await requireRole("TEACHER");
  const { classroomId } = await params;
  const { year, column } = await searchParams;
  const initialColumnFilter = parseAssessmentColumnFilter(column);

  if (!(await assertClassroomAccess(user, classroomId))) {
    redirect("/dashboard/teacher");
  }

  const [data, teacherClassrooms, selectedSchool] = await Promise.all([
    getAssessmentMatrix(classroomId, year),
    getTeacherClassrooms(user),
    getSelectedSchool(user),
  ]);
  if (!data) notFound();

  if (selectedSchool && data.classroom.schoolId !== selectedSchool.id) {
    redirect("/dashboard/teacher");
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
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/teacher/assessments">← Back to assessments</Link>
        </Button>
        <h1 className="text-2xl font-bold md:text-3xl">
          {data.classroom.name} — Assessments
        </h1>
        <p className="text-muted-foreground">
          {data.classroom.school.name}
          {data.academicYear ? ` · ${data.academicYear.name}` : " · No active year"}
        </p>
      </div>

      <Suspense fallback={<ClassroomEntryLoading />}>
        <AssessmentsClassroomContent
          classroomId={classroomId}
          classroomOptions={classroomOptions}
          basePath="/teacher/assessments"
        >
          <AssessmentMatrix
            classroomId={classroomId}
            academicYearId={data.academicYear?.id}
            rows={data.rows}
            columnDates={data.columnDates}
            initialColumnFilter={initialColumnFilter}
          />
        </AssessmentsClassroomContent>
      </Suspense>
    </div>
  );
}
