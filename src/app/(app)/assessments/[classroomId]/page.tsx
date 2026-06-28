import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getAssessmentMatrix } from "@/actions/assessments";
import { getClassroomsForAssessment } from "@/actions/enrollments";
import { requirePermission } from "@/lib/auth/session";
import { AssessmentMatrix } from "@/components/assessments/assessment-matrix";
import { AssessmentsClassroomContent } from "@/components/assessments/assessments-classroom-content";
import { ClassroomEntryLoading } from "@/components/shared/grade-change-loading";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Assessment Scores" };

type PageProps = {
  params: Promise<{ classroomId: string }>;
  searchParams: Promise<{ year?: string }>;
};

export default async function ClassroomAssessmentsPage({
  params,
  searchParams,
}: PageProps) {
  await requirePermission("assessments:read");
  const { classroomId } = await params;
  const { year } = await searchParams;

  const data = await getAssessmentMatrix(classroomId, year);
  if (!data) notFound();

  const classrooms = await getClassroomsForAssessment();
  const classroomOptions = classrooms.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/assessments">← Back to grades</Link>
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
          <AssessmentMatrix classroomId={classroomId} rows={data.rows} />
        </AssessmentsClassroomContent>
      </Suspense>
    </div>
  );
}
