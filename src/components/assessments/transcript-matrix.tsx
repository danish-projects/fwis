"use client";

import { Fragment, useState } from "react";
import { StudentNameWithGender } from "@/components/students/student-name-with-gender";
import type { GenderCode } from "@/lib/setup-types";
import type { TranscriptMatrixRow } from "@/lib/assessments/score-matrix-types";
import type { GradingScaleConfig } from "@/lib/grades/grading-scale-types";
import { getFinalGradeBreakdown } from "@/lib/grades/calculate-final-grade";
import { TranscriptGradeGuide } from "@/components/assessments/transcript-grade-guide";
import {
  ASSESSMENT_TYPE_LABELS,
  QUIZ_TYPES,
} from "@/lib/validations/enrollment";
import { formatPercent } from "@/lib/utils";

type TranscriptMatrixProps = {
  rows: TranscriptMatrixRow[];
  gradingScale: GradingScaleConfig;
};

export function TranscriptMatrix({ rows, gradingScale }: TranscriptMatrixProps) {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const columnCount = QUIZ_TYPES.length + 6;

  return (
    <div className="space-y-4">
      <TranscriptGradeGuide gradingScale={gradingScale} />

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="sticky left-0 z-10 bg-muted/50 p-3 font-medium">Student</th>
              <th className="p-3 font-medium whitespace-nowrap">Attendance %</th>
              <th className="p-3 font-medium whitespace-nowrap">Behavior</th>
              {QUIZ_TYPES.map((type) => (
                <th key={type} className="p-3 font-medium whitespace-nowrap">
                  {ASSESSMENT_TYPE_LABELS[type]}
                </th>
              ))}
              <th className="p-3 font-medium">Final %</th>
              <th className="p-3 font-medium">Grade</th>
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
                    <td className="sticky left-0 z-10 bg-background p-3 font-medium">
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
                    <td className="p-3 tabular-nums text-muted-foreground">
                      {formatPercent(row.attendancePct)}
                    </td>
                    <td className="p-3 tabular-nums text-muted-foreground">
                      <div>{formatPercent(row.behaviorPct)}</div>
                      <div className="text-xs">{row.behaviorLevel}</div>
                    </td>
                    {QUIZ_TYPES.map((type) => (
                      <td key={type} className="p-3 text-center tabular-nums">
                        {row.scores[type] !== undefined
                          ? formatPercent(row.scores[type]!)
                          : "—"}
                      </td>
                    ))}
                    <td className="p-3 font-medium tabular-nums">
                      {formatPercent(row.finalPct)}
                    </td>
                    <td className="p-3 font-medium">
                      {row.letterGrade}
                      {row.classRank != null && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
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
