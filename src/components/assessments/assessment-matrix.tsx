"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { AssessmentColumnFilterSelect } from "@/components/assessments/assessment-column-filter-select";
import { MatrixExportButton } from "@/components/export/matrix-export-button";
import { StudentNameWithGender } from "@/components/students/student-name-with-gender";
import type { AssessmentType, GenderCode } from "@/lib/setup-types";
import { bulkUpsertAssessmentScores } from "@/actions/assessments";
import type { AssessmentColumnDates } from "@/lib/assessments/assessment-column-dates";
import type { ScoreMatrixRow } from "@/lib/assessments/score-matrix-types";
import {
  ALL_ASSESSMENT_COLUMNS_VALUE,
  getVisibleAssessmentColumns,
  type AssessmentColumnFilter,
} from "@/lib/assessments/assessment-column-filter";
import {
  ASSESSMENT_TYPE_LABELS,
  ASSESSMENT_TYPES,
} from "@/lib/validations/enrollment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AssessmentMatrixProps = {
  classroomId: string;
  academicYearId?: string | null;
  rows: ScoreMatrixRow[];
  columnDates?: AssessmentColumnDates;
  initialColumnFilter?: AssessmentColumnFilter;
};

export function AssessmentMatrix({
  classroomId,
  academicYearId,
  rows: initialRows,
  columnDates = {},
  initialColumnFilter = ALL_ASSESSMENT_COLUMNS_VALUE,
}: AssessmentMatrixProps) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [columnFilter, setColumnFilter] = useState<AssessmentColumnFilter>(
    initialColumnFilter
  );
  const [isPending, startTransition] = useTransition();

  const visibleColumns = useMemo(
    () => getVisibleAssessmentColumns(columnFilter),
    [columnFilter]
  );

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams({ classroomId });
    if (academicYearId) params.set("year", academicYearId);
    return `/api/export/assessments?${params.toString()}`;
  }, [classroomId, academicYearId]);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    setColumnFilter(initialColumnFilter);
  }, [initialColumnFilter]);

  function updateScore(
    enrollmentId: string,
    type: AssessmentType,
    value: string
  ) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.enrollmentId !== enrollmentId) return r;

        const nextScores = { ...r.scores };
        if (value === "" || Number.isNaN(Number(value))) {
          delete nextScores[type];
        } else {
          nextScores[type] = Math.min(100, Math.max(0, Number(value)));
        }

        return { ...r, scores: nextScores };
      })
    );
  }

  function handleSave() {
    const scores = rows.flatMap((r) =>
      ASSESSMENT_TYPES.filter((type) => r.scores[type] !== undefined).map((type) => ({
        enrollmentId: r.enrollmentId,
        type,
        score: r.scores[type]!,
      }))
    );

    if (scores.length === 0) {
      toast.error("Enter at least one score to save");
      return;
    }

    startTransition(async () => {
      try {
        await bulkUpsertAssessmentScores(classroomId, scores);
        toast.success("Assessment scores saved");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Save failed");
      }
    });
  }

  const columnCount = visibleColumns.length + 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <AssessmentColumnFilterSelect
          value={columnFilter}
          onChange={setColumnFilter}
          label="Show column"
        />
        {columnFilter !== ALL_ASSESSMENT_COLUMNS_VALUE && (
          <p className="text-sm text-muted-foreground sm:pb-2">
            Showing {visibleColumns.length} column
            {visibleColumns.length === 1 ? "" : "s"} — choose All to see every quiz and exam.
          </p>
        )}
        <MatrixExportButton
          exportUrl={exportUrl}
          disabled={rows.length === 0}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full max-w-full border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="sticky left-0 z-10 min-w-[7.5rem] bg-muted/50 px-2 py-2 font-medium sm:min-w-[10rem] sm:px-3 sm:py-3">
                Student
              </th>
              {visibleColumns.map((type) => (
                <th
                  key={type}
                  className="min-w-[4.5rem] px-1 py-2 font-medium whitespace-nowrap sm:min-w-[5.5rem] sm:px-2 sm:py-3"
                >
                  <div className="hidden sm:block">{ASSESSMENT_TYPE_LABELS[type]}</div>
                  <div className="sm:hidden">
                    {ASSESSMENT_TYPE_LABELS[type].replace("Project", "").trim()}
                  </div>
                  {columnDates[type] ? (
                    <div className="text-[9px] font-normal text-muted-foreground sm:text-[10px]">
                      {columnDates[type]}
                    </div>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.enrollmentId} className="border-b last:border-0">
                <td className="sticky left-0 z-10 bg-background px-2 py-1.5 font-medium sm:px-3 sm:py-2">
                  <StudentNameWithGender
                    name={row.studentName}
                    gender={row.gender as GenderCode | string}
                    studentNumber={row.studentNumber}
                  />
                </td>
                {visibleColumns.map((type) => (
                  <td key={type} className="px-1 py-1 sm:px-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      className="h-8 w-full min-w-0 px-1 text-center text-xs sm:h-9 sm:w-20 sm:text-sm"
                      value={row.scores[type] ?? ""}
                      onChange={(e) =>
                        updateScore(row.enrollmentId, type, e.target.value)
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="p-8 text-center text-muted-foreground">
                  No active enrollments in this grade.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save All Scores"}
          </Button>
        </div>
      )}
    </div>
  );
}
