import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getTranscriptMatrix } from "@/actions/assessments";
import { assertClassroomAccess } from "@/lib/auth/enrollment-access";
import { requireRole } from "@/lib/auth/session";
import { getTeacherClassrooms } from "@/lib/auth/teacher-defaults";
import { TranscriptMatrix } from "@/components/assessments/transcript-matrix";
import { AssessmentsClassroomContent } from "@/components/assessments/assessments-classroom-content";
import { ClassroomEntryLoading } from "@/components/shared/grade-change-loading";
import { filterClassroomsForSelectedSchool } from "@/lib/school/filter-classrooms";
import { getSelectedSchool } from "@/lib/school/resolve-school";

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

  const [data, teacherClassrooms, selectedSchool] = await Promise.all([
    getTranscriptMatrix(classroomId, year),
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
          <TranscriptMatrix
            rows={data.rows}
            gradingScale={data.gradingScale}
            columnDates={data.columnDates}
          />
        </AssessmentsClassroomContent>
      </Suspense>
    </div>
  );
}
