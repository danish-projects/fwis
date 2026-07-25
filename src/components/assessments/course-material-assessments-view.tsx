"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { CourseMaterialAssessmentsPageData } from "@/actions/course-material-assessments";
import { gradeNameToSlug } from "@/lib/lesson-plans/page-params";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CourseMaterialAssessmentsViewProps = {
  data: CourseMaterialAssessmentsPageData;
  pagePath: string;
};

function buildFileUrl(params: {
  schoolId: string;
  gradeId: number;
  assessmentType: string;
  fileId: string;
  mode: "view" | "download";
}) {
  const search = new URLSearchParams({
    schoolId: params.schoolId,
    gradeId: String(params.gradeId),
    assessmentType: params.assessmentType,
    fileId: params.fileId,
    mode: params.mode,
  });
  return `/api/course-materials/assessments/file?${search.toString()}`;
}

export function CourseMaterialAssessmentsView({
  data,
  pagePath,
}: CourseMaterialAssessmentsViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const appliedGradeId =
    data.selectedGradeId != null ? String(data.selectedGradeId) : "";
  const appliedAssessmentType = data.selectedAssessmentType ?? "";

  const [draftGradeId, setDraftGradeId] = useState(appliedGradeId);
  const [draftAssessmentType, setDraftAssessmentType] = useState(
    appliedAssessmentType
  );

  useEffect(() => {
    setDraftGradeId(appliedGradeId);
    setDraftAssessmentType(appliedAssessmentType);
  }, [appliedGradeId, appliedAssessmentType]);

  const filterChanged =
    draftGradeId !== appliedGradeId ||
    draftAssessmentType !== appliedAssessmentType;

  function applyFilters(gradeId: string, assessmentType: string) {
    const grade = data.grades.find((item) => String(item.id) === gradeId);
    const params = new URLSearchParams();
    if (grade) params.set("grade", gradeNameToSlug(grade.name));
    if (assessmentType) params.set("exam", assessmentType);
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pagePath}?${query}` : pagePath);
    });
  }

  function handleApply(event: React.FormEvent) {
    event.preventDefault();
    if (!filterChanged || isPending) return;
    applyFilters(draftGradeId, draftAssessmentType);
  }

  async function handleDownload(fileId: string, fileName: string) {
    if (data.selectedGradeId == null || !data.selectedAssessmentType) return;

    const url = buildFileUrl({
      schoolId: data.schoolId,
      gradeId: data.selectedGradeId,
      assessmentType: data.selectedAssessmentType,
      fileId,
      mode: "download",
    });
    const response = await fetch(url);
    if (!response.ok) return;

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

  const canViewInline = (mimeType: string) => mimeType === "application/pdf";

  return (
    <div className="space-y-6">
      <form
        className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
        onSubmit={handleApply}
      >
        <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
          <label htmlFor="assessmentMaterialGrade" className="text-sm font-medium">
            Grade
          </label>
          <select
            id="assessmentMaterialGrade"
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
          <label htmlFor="assessmentMaterialExam" className="text-sm font-medium">
            Assessment
          </label>
          <select
            id="assessmentMaterialExam"
            value={draftAssessmentType}
            onChange={(event) => setDraftAssessmentType(event.target.value)}
            disabled={isPending}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
          >
            {data.assessmentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
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
              Filtering...
            </>
          ) : (
            "Filter"
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
            <span className="sr-only">Loading assessment materials...</span>
          </div>
        )}

        {!data.driveConfigured ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Google Drive not configured</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Set{" "}
                <code className="text-xs">GOOGLE_DRIVE_FWIS_DOCS_FOLDER_ID</code>{" "}
                and Google service account credentials in the server environment.
              </p>
              <p>
                Assessment PDFs are read from{" "}
                <span className="font-medium text-foreground">
                  FWIS Docs/&lt;year&gt;/Assessments/&lt;exam&gt;/&lt;grade&gt;
                </span>
                .
              </p>
            </CardContent>
          </Card>
        ) : data.driveError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {data.driveError}
          </p>
        ) : data.documents.length > 0 &&
          data.selectedGradeId != null &&
          data.selectedAssessmentType ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Files
                {data.folderPath ? (
                  <span className="mt-1 block text-sm font-normal text-muted-foreground">
                    {data.folderPath}
                  </span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">File</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.documents.map((document) => (
                      <tr
                        key={document.fileId}
                        className="border-b last:border-0"
                      >
                        <td className="py-3 pr-4">{document.fileName}</td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            {canViewInline(document.mimeType) && (
                              <Button asChild size="sm" variant="outline">
                                <a
                                  href={buildFileUrl({
                                    schoolId: data.schoolId,
                                    gradeId: data.selectedGradeId!,
                                    assessmentType: data.selectedAssessmentType!,
                                    fileId: document.fileId,
                                    mode: "view",
                                  })}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  View
                                </a>
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                handleDownload(
                                  document.fileId,
                                  document.fileName
                                )
                              }
                            >
                              Download
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-2 py-10 text-center text-sm text-muted-foreground">
              <p>No files found for the selected grade and assessment.</p>
              {data.folderPath && (
                <p>
                  Expected folder:{" "}
                  <span className="font-medium text-foreground">
                    {data.folderPath}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
