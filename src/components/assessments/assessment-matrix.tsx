"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { StudentNameWithGender } from "@/components/students/student-name-with-gender";
import type { AssessmentType, GenderCode } from "@/lib/setup-types";
import { bulkUpsertAssessmentScores } from "@/actions/assessments";
import type { ScoreMatrixRow } from "@/lib/assessments/score-matrix-types";
import {
  ASSESSMENT_TYPE_LABELS,
  ASSESSMENT_TYPES,
} from "@/lib/validations/enrollment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AssessmentMatrixProps = {
  classroomId: string;
  rows: ScoreMatrixRow[];
};

export function AssessmentMatrix({ classroomId, rows: initialRows }: AssessmentMatrixProps) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

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

  const columnCount = ASSESSMENT_TYPES.length + 1;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="sticky left-0 z-10 bg-muted/50 p-3 font-medium">Student</th>
              {ASSESSMENT_TYPES.map((type) => (
                <th key={type} className="p-3 font-medium whitespace-nowrap">
                  {ASSESSMENT_TYPE_LABELS[type]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.enrollmentId} className="border-b last:border-0">
                <td className="sticky left-0 z-10 bg-background p-3 font-medium">
                  <StudentNameWithGender
                    name={row.studentName}
                    gender={row.gender as GenderCode | string}
                    studentNumber={row.studentNumber}
                  />
                </td>
                {ASSESSMENT_TYPES.map((type) => (
                  <td key={type} className="p-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      className="h-9 w-20"
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
