import { notFound, redirect } from "next/navigation";
import { getCourseMaterialAssessmentsPageData } from "@/actions/course-material-assessments";
import { CourseMaterialAssessmentsView } from "@/components/assessments/course-material-assessments-view";
import { requireRole } from "@/lib/auth/session";
import { gradeNameToSlug } from "@/lib/lesson-plans/page-params";

export const metadata = { title: "Assessments" };

type PageProps = {
  searchParams: Promise<{ grade?: string; exam?: string }>;
};

export default async function TeacherAssessmentsPage({ searchParams }: PageProps) {
  await requireRole("TEACHER");
  const params = await searchParams;

  const data = await getCourseMaterialAssessmentsPageData({
    gradeParam: params.grade,
    assessmentType: params.exam,
  });
  if (!data) notFound();

  const selectedGradeName =
    data.selectedGradeId != null
      ? data.grades.find((grade) => grade.id === data.selectedGradeId)?.name ??
        null
      : null;
  const expectedGradeSlug = selectedGradeName
    ? gradeNameToSlug(selectedGradeName)
    : null;
  const actualGradeSlug = params.grade?.trim().toLowerCase() ?? null;
  const expectedExam = data.selectedAssessmentType;
  const actualExam = params.exam ?? null;

  if (
    expectedGradeSlug !== actualGradeSlug ||
    expectedExam !== actualExam
  ) {
    const query = new URLSearchParams();
    if (expectedGradeSlug) query.set("grade", expectedGradeSlug);
    if (expectedExam) query.set("exam", expectedExam);
    const qs = query.toString();
    redirect(qs ? `/teacher/assessments?${qs}` : "/teacher/assessments");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Assessments</h1>
        <p className="text-muted-foreground">
          Course Materials · assessment PDFs for {data.schoolName}
        </p>
      </div>

      <CourseMaterialAssessmentsView
        data={data}
        pagePath="/teacher/assessments"
      />
    </div>
  );
}
