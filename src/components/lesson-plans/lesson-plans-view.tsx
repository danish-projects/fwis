"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { LessonPlanPageData } from "@/actions/lesson-plans";
import { formatLessonPlanLabel } from "@/lib/calendar/lesson-plan";
import { lessonPlanSessionTypeLabel } from "@/lib/lesson-plans/instruction-day";
import { gradeNameToSlug } from "@/lib/lesson-plans/page-params";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LessonPlansViewProps = {
  data: LessonPlanPageData;
  pagePath: string;
};

function buildFileUrl(
  schoolId: string,
  gradeId: number,
  lessonPlanNumber: number,
  mode: "view" | "download"
) {
  const params = new URLSearchParams({
    schoolId,
    gradeId: String(gradeId),
    lessonPlanNumber: String(lessonPlanNumber),
    mode,
  });
  return `/api/lesson-plans/file?${params.toString()}`;
}

export function LessonPlansView({ data, pagePath }: LessonPlansViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const appliedGradeId =
    data.selectedGradeId != null ? String(data.selectedGradeId) : "";
  const appliedLessonPlanNumber =
    data.selectedLessonPlanNumber != null
      ? String(data.selectedLessonPlanNumber)
      : "";

  const [draftGradeId, setDraftGradeId] = useState(appliedGradeId);
  const [draftLessonPlanNumber, setDraftLessonPlanNumber] = useState(
    appliedLessonPlanNumber
  );

  useEffect(() => {
    setDraftGradeId(appliedGradeId);
    setDraftLessonPlanNumber(appliedLessonPlanNumber);
  }, [appliedGradeId, appliedLessonPlanNumber]);

  const filterChanged =
    draftGradeId !== appliedGradeId ||
    draftLessonPlanNumber !== appliedLessonPlanNumber;

  const weekByNumber = useMemo(
    () => new Map(data.weeks.map((week) => [week.lessonPlanNumber, week])),
    [data.weeks]
  );

  function applyFilters(gradeId: string, lessonPlanNumber: string) {
    const grade = data.grades.find((item) => String(item.id) === gradeId);
    const params = new URLSearchParams();
    if (grade) params.set("grade", gradeNameToSlug(grade.name));
    if (lessonPlanNumber) params.set("week", lessonPlanNumber);
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pagePath}?${query}` : pagePath);
    });
  }

  function handleApply(event: React.FormEvent) {
    event.preventDefault();
    if (!filterChanged || isPending) return;
    applyFilters(draftGradeId, draftLessonPlanNumber);
  }

  async function handleDownload(
    gradeId: number,
    lessonPlanNumber: number,
    fileName: string
  ) {
    const url = buildFileUrl(data.schoolId, gradeId, lessonPlanNumber, "download");
    const response = await fetch(url);
    if (!response.ok) {
      return;
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }

  const selectedDay = data.selectedDay;
  const isInstructionalDay = selectedDay?.isInstructional ?? false;

  return (
    <div className="space-y-6">
      <form
        className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
        onSubmit={handleApply}
      >
        <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
          <label htmlFor="lessonPlanGrade" className="text-sm font-medium">
            Grade
          </label>
          <select
            id="lessonPlanGrade"
            value={draftGradeId}
            onChange={(event) => setDraftGradeId(event.target.value)}
            disabled={isPending || data.grades.length === 0}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
          >
            {data.grades.length === 0 ? (
              <option value="">No grades available</option>
            ) : (
              data.grades.map((grade) => (
                <option key={grade.id} value={String(grade.id)}>
                  {grade.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
          <label htmlFor="lessonPlanWeek" className="text-sm font-medium">
            Day
          </label>
          <select
            id="lessonPlanWeek"
            value={draftLessonPlanNumber}
            onChange={(event) => setDraftLessonPlanNumber(event.target.value)}
            disabled={isPending || data.weeks.length === 0}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
          >
            {data.weeks.length === 0 ? (
              <option value="">No calendar days available</option>
            ) : (
              data.weeks.map((week) => (
                <option
                  key={week.calendarDayId}
                  value={String(week.lessonPlanNumber)}
                >
                  {formatLessonPlanLabel(week.lessonPlanNumber)} ·{" "}
                  {formatDate(week.date)} ·{" "}
                  {lessonPlanSessionTypeLabel(week.sessionType)}
                </option>
              ))
            )}
          </select>
        </div>

        <Button
          type="submit"
          variant="secondary"
          disabled={isPending || !filterChanged}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Applying...
            </>
          ) : (
            "Apply"
          )}
        </Button>
      </form>

      <div className="relative">
        {isPending && (
          <div
            className="absolute inset-0 z-10 flex min-h-[12rem] items-center justify-center rounded-lg bg-background/60"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
            <span className="sr-only">Loading lesson plans...</span>
          </div>
        )}
      {!selectedDay ? (
        <p className="rounded-lg border py-12 text-center text-muted-foreground">
          Select a grade and calendar day to view lesson plans.
        </p>
      ) : !isInstructionalDay ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-base font-medium">
              This is {selectedDay.sessionTypeLabel}. There is no lesson plan.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Lesson plans are only available on instructional days.
            </p>
          </CardContent>
        </Card>
      ) : data.driveError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {data.driveError}
        </p>
      ) : data.documents.length > 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Grade</th>
                    <th className="pb-3 pr-4 font-medium">Week</th>
                    <th className="pb-3 pr-4 font-medium">Date</th>
                    <th className="pb-3 pr-4 font-medium">File</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.documents.map((document) => {
                    const week = weekByNumber.get(document.lessonPlanNumber);
                    return (
                      <tr
                        key={`${document.gradeId}-${document.lessonPlanNumber}`}
                        className="border-b last:border-0"
                      >
                        <td className="py-3 pr-4">{document.gradeName}</td>
                        <td className="py-3 pr-4">
                          {formatLessonPlanLabel(document.lessonPlanNumber)}
                        </td>
                        <td className="py-3 pr-4">
                          {week ? formatDate(week.date) : "—"}
                        </td>
                        <td className="py-3 pr-4">{document.fileName}</td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm" variant="outline">
                              <a
                                href={buildFileUrl(
                                  data.schoolId,
                                  document.gradeId,
                                  document.lessonPlanNumber,
                                  "view"
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                View
                              </a>
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                handleDownload(
                                  document.gradeId,
                                  document.lessonPlanNumber,
                                  document.fileName
                                )
                              }
                            >
                              Download
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : !data.driveConfigured ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Google Drive not configured</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Set the FWIS Docs Google Drive folder ID on the selected academic
              year and add Google service account credentials in the server
              environment.
            </p>
            <p>
              {data.academicYearName ? (
                <>
                  Current academic year:{" "}
                  <span className="font-medium text-foreground">
                    {data.academicYearName}
                  </span>
                  . Upload PDF files in{" "}
                  <span className="font-medium text-foreground">
                    FWIS Docs/{data.academicYearName}/Lesson Plans/&lt;grade&gt;
                  </span>{" "}
                  using names like{" "}
                </>
              ) : (
                <>
                  Upload PDF files in{" "}
                  <span className="font-medium text-foreground">
                    FWIS Docs/&lt;year&gt;/Lesson Plans/&lt;grade&gt;
                  </span>{" "}
                  using names like{" "}
                </>
              )}
              <span className="font-medium text-foreground">
                Grade 1 - Week - 01.pdf
              </span>
              .
            </p>
          </CardContent>
        </Card>
      ) : data.missingReasons.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lesson plan not found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              This is an instructional day, but no lesson plan PDF was found in
              Google Drive. Possible reasons:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {data.missingReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <p className="rounded-lg border py-12 text-center text-muted-foreground">
          No lesson plan PDF found for the selected instructional day.
        </p>
      )}
      </div>
    </div>
  );
}
