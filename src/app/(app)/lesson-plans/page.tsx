import { notFound, redirect } from "next/navigation";
import { getLessonPlanPageData } from "@/actions/lesson-plans";
import { LessonPlansView } from "@/components/lesson-plans/lesson-plans-view";
import { requirePermission } from "@/lib/auth/session";
import {
  buildLessonPlanPagePath,
  lessonPlanParamsNeedRedirect,
} from "@/lib/lesson-plans/page-params";

export const metadata = { title: "Lesson Plans" };

type PageProps = {
  searchParams: Promise<{ grade?: string; week?: string }>;
};

export default async function LessonPlansPage({ searchParams }: PageProps) {
  await requirePermission("lesson-plans:read");
  const params = await searchParams;
  const lessonPlanNumber = params.week ? Number(params.week) : undefined;

  const data = await getLessonPlanPageData({
    gradeId: undefined,
    gradeParam: params.grade,
    lessonPlanNumber: Number.isFinite(lessonPlanNumber)
      ? lessonPlanNumber
      : undefined,
  });

  if (!data) notFound();

  const selectedGradeName =
    data.selectedGradeId != null
      ? data.grades.find((grade) => grade.id === data.selectedGradeId)?.name ?? null
      : null;

  if (
    lessonPlanParamsNeedRedirect(
      params,
      selectedGradeName,
      data.selectedLessonPlanNumber
    )
  ) {
    redirect(
      buildLessonPlanPagePath(
        "/lesson-plans",
        selectedGradeName,
        data.selectedLessonPlanNumber
      )
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Lesson Plans</h1>
        <p className="text-muted-foreground">
          Weekly lesson plan PDFs for {data.schoolName}
        </p>
      </div>

      <LessonPlansView data={data} pagePath="/lesson-plans" />
    </div>
  );
}
