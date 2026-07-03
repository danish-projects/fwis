"use client";

import { Fragment, useMemo, useState } from "react";
import { AssessmentColumnFilterSelect } from "@/components/assessments/assessment-column-filter-select";
import { StudentNameWithGender } from "@/components/students/student-name-with-gender";
import type { GenderCode } from "@/lib/setup-types";
import type { AssessmentColumnDates } from "@/lib/assessments/assessment-column-dates";
import type { TranscriptMatrixRow } from "@/lib/assessments/score-matrix-types";
import type { GradingScaleConfig } from "@/lib/grades/grading-scale-types";
import { getFinalGradeBreakdown } from "@/lib/grades/calculate-final-grade";
import { TranscriptGradeGuide } from "@/components/assessments/transcript-grade-guide";
import {
  ALL_ASSESSMENT_COLUMNS_VALUE,
  getVisibleTranscriptQuizColumns,
  TRANSCRIPT_COLUMN_FILTER_OPTIONS,
  type AssessmentColumnFilter,
} from "@/lib/assessments/assessment-column-filter";
import { ASSESSMENT_TYPE_LABELS } from "@/lib/validations/enrollment";
import { formatPercent } from "@/lib/utils";

type TranscriptMatrixProps = {
  rows: TranscriptMatrixRow[];
  gradingScale: GradingScaleConfig;
  columnDates?: AssessmentColumnDates;
};

export function TranscriptMatrix({
  rows,
  gradingScale,
  columnDates = {},
}: TranscriptMatrixProps) {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [columnFilter, setColumnFilter] = useState<AssessmentColumnFilter>(
    ALL_ASSESSMENT_COLUMNS_VALUE
  );

  const visibleQuizColumns = useMemo(
    () => getVisibleTranscriptQuizColumns(columnFilter),
    [columnFilter]
  );

  const columnCount = visibleQuizColumns.length + 5;

  return (
    <div className="space-y-4">
      <TranscriptGradeGuide gradingScale={gradingScale} />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <AssessmentColumnFilterSelect
          value={columnFilter}
          onChange={setColumnFilter}
          label="Show quiz"
          options={TRANSCRIPT_COLUMN_FILTER_OPTIONS}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full max-w-full border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="sticky left-0 z-10 min-w-[7.5rem] bg-muted/50 px-2 py-2 font-medium sm:min-w-[10rem] sm:px-3 sm:py-3">
                Student
              </th>
              <th className="min-w-[4rem] px-1 py-2 font-medium whitespace-nowrap sm:px-2 sm:py-3">
                Attend %
              </th>
              <th className="min-w-[4rem] px-1 py-2 font-medium whitespace-nowrap sm:px-2 sm:py-3">
                Behavior
              </th>
              {visibleQuizColumns.map((type) => (
                <th
                  key={type}
                  className="min-w-[3.5rem] px-1 py-2 font-medium whitespace-nowrap sm:min-w-[4.5rem] sm:px-2 sm:py-3"
                >
                  <div>{ASSESSMENT_TYPE_LABELS[type]}</div>
                  {columnDates[type] ? (
                    <div className="text-[9px] font-normal text-muted-foreground sm:text-[10px]">
                      {columnDates[type]}
                    </div>
                  ) : null}
                </th>
              ))}
              <th className="min-w-[3.5rem] px-1 py-2 font-medium sm:px-2 sm:py-3">Final %</th>
              <th className="min-w-[3rem] px-1 py-2 font-medium sm:px-2 sm:py-3">Grade</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isExpanded = expandedRowId === row.enrollmentId;
              const breakdown = getFinalGradeBreakdown(
                {
                  attendancePct: row.attendancePct,
                  behaviorPct: row.behaviorPct,
                  scores: row.scores,
                },
                gradingScale
              );

              return (
                <Fragment key={row.enrollmentId}>
                  <tr className="border-b last:border-0">
                    <td className="sticky left-0 z-10 bg-background px-2 py-1.5 font-medium sm:px-3 sm:py-2">
                      <button
                        type="button"
                        className="text-left hover:underline"
                        title="Show calculation breakdown"
                        onClick={() =>
                          setExpandedRowId(isExpanded ? null : row.enrollmentId)
                        }
                      >
                        <StudentNameWithGender
                          name={row.studentName}
                          gender={row.gender as GenderCode | string}
                          studentNumber={row.studentNumber}
                        />
                      </button>
                    </td>
                    <td className="px-1 py-1.5 tabular-nums text-muted-foreground sm:px-2 sm:py-2">
                      {formatPercent(row.attendancePct)}
                    </td>
                    <td className="px-1 py-1.5 tabular-nums text-muted-foreground sm:px-2 sm:py-2">
                      <div>{formatPercent(row.behaviorPct)}</div>
                      <div className="text-[10px] sm:text-xs">{row.behaviorLevel}</div>
                    </td>
                    {visibleQuizColumns.map((type) => (
                      <td
                        key={type}
                        className="px-1 py-1.5 text-center tabular-nums sm:px-2 sm:py-2"
                      >
                        {row.scores[type] !== undefined
                          ? formatPercent(row.scores[type]!)
                          : "—"}
                      </td>
                    ))}
                    <td className="px-1 py-1.5 font-medium tabular-nums sm:px-2 sm:py-2">
                      {formatPercent(row.finalPct)}
                    </td>
                    <td className="px-1 py-1.5 font-medium sm:px-2 sm:py-2">
                      {row.letterGrade}
                      {row.classRank != null && (
                        <span className="ml-1 text-[10px] font-normal text-muted-foreground sm:text-xs">
                          (#{row.classRank})
                        </span>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b bg-muted/20">
                      <td colSpan={columnCount} className="px-3 py-3">
                        <p className="mb-2 text-xs font-medium">
                          Calculation for {row.studentName}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {breakdown.parts.map((part) => (
                            <span key={part.label}>
                              {part.label}: {part.score}% × {part.weightPct}% ={" "}
                              <span className="font-medium text-foreground">
                                {part.contribution.toFixed(2)}
                              </span>
                            </span>
                          ))}
                          <span>
                            Behavior level:{" "}
                            <span className="font-medium text-foreground">
                              {row.behaviorLevel}
                            </span>{" "}
                            · Weight: {row.behaviorWeightPct}% · Contribution:{" "}
                            <span className="font-medium text-foreground">
                              {row.behaviorContribution.toFixed(2)}
                            </span>
                          </span>
                          <span className="font-medium text-foreground">
                            → Total: {breakdown.finalPct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
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
    </div>
  );
}
