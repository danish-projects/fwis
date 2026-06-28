import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getTranscriptMatrix } from "@/actions/assessments";
import { assertClassroomAccess } from "@/lib/auth/enrollment-access";
import { requireRole } from "@/lib/auth/session";
import { getTeacherClassrooms } from "@/lib/auth/teacher-defaults";
import { TranscriptMatrix } from "@/components/assessments/transcript-matrix";
import { AssessmentsClassroomContent } from "@/components/assessments/assessments-classroom-content";
import { ClassroomEntryLoading } from "@/components/shared/grade-change-loading";

export const metadata = { title: "Transcript" };

type PageProps = {
  params: Promise<{ classroomId: string }>;
  searchParams: Promise<{ year?: string }>;
};

export default async function TeacherTranscriptClassPage({
  params,
  searchParams,
}: PageProps) {
  const user = await requireRole("TEACHER");
  const { classroomId } = await params;
  const { year } = await searchParams;

  if (!(await assertClassroomAccess(user, classroomId))) {
    redirect("/dashboard/teacher");
  }

  const data = await getTranscriptMatrix(classroomId, year);
  if (!data) notFound();

  const classroomOptions = (await getTeacherClassrooms(user)).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">
          {data.classroom.name} — Transcript
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
          basePath="/teacher/transcript"
        >
          <TranscriptMatrix rows={data.rows} gradingScale={data.gradingScale} />
        </AssessmentsClassroomContent>
      </Suspense>
    </div>
  );
}
