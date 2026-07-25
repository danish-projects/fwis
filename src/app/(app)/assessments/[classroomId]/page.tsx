import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getAssessmentMatrix } from "@/actions/assessments";
import { getClassroomsForAssessment } from "@/actions/enrollments";
import { getSessionUser, requirePermission } from "@/lib/auth/session";
import { AssessmentMatrix } from "@/components/assessments/assessment-matrix";
import { AssessmentsClassroomContent } from "@/components/assessments/assessments-classroom-content";
import { ClassroomEntryLoading } from "@/components/shared/grade-change-loading";
import { Button } from "@/components/ui/button";
import { filterClassroomsForSelectedSchool } from "@/lib/school/filter-classrooms";
import { getSelectedSchool } from "@/lib/school/resolve-school";
import { parseAssessmentColumnFilter } from "@/lib/assessments/assessment-column-filter";

export const metadata = { title: "Assessment Scores" };

type PageProps = {
  params: Promise<{ classroomId: string }>;
  searchParams: Promise<{ year?: string; column?: string }>;
};

export default async function ClassroomAssessmentsPage({
  params,
  searchParams,
}: PageProps) {
  await requirePermission("assessments:read");
  const user = await getSessionUser();
  const { classroomId } = await params;
  const { year, column } = await searchParams;
  const initialColumnFilter = parseAssessmentColumnFilter(column);

  const [data, classrooms, selectedSchool] = await Promise.all([
    getAssessmentMatrix(classroomId, year),
    getClassroomsForAssessment(),
    user ? getSelectedSchool(user) : null,
  ]);
  if (!data) notFound();

  if (selectedSchool && data.classroom.schoolId !== selectedSchool.id) {
    redirect("/assessments");
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
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/assessments">← Back to assessments</Link>
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
          basePath="/assessments"
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
