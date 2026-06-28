"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { GradingScaleConfig } from "@/lib/grades/grading-scale-types";
import { buildFinalGradeFormula } from "@/lib/grades/calculate-final-grade";
import { ASSESSMENT_TYPE_LABELS, QUIZ_TYPES } from "@/lib/validations/enrollment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TranscriptGradeGuideProps = {
  gradingScale: GradingScaleConfig;
};

export function TranscriptGradeGuide({ gradingScale }: TranscriptGradeGuideProps) {
  const [open, setOpen] = useState(false);
  const { weights, letterBands } = gradingScale;

  return (
    <Card>
      <CardHeader className="pb-3">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <CardTitle className="text-base">How the final score is calculated</CardTitle>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
      </CardHeader>

      {open && (
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Final % is a weighted average. Each component below contributes{" "}
            <span className="font-medium text-foreground">score × weight</span> to the total.
            Assessment scores left blank count as 0 until entered.
          </p>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-3 py-2 font-medium">Component</th>
                  <th className="px-3 py-2 font-medium">Weight</th>
                  <th className="px-3 py-2 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-3 py-2">Attendance</td>
                  <td className="px-3 py-2">{Math.round(weights.attendance * 100)}%</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    Average Sunday attendance for the year (Present + Tardy)
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-3 py-2">Behavior</td>
                  <td className="px-3 py-2">{Math.round(weights.behavior * 100)}%</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    Base score 85 plus weekly rating adjustments recorded on attendance
                    (default 85 / Meets Expectations when no ratings exist)
                  </td>
                </tr>
                {QUIZ_TYPES.map((type) => (
                  <tr key={type} className="border-b">
                    <td className="px-3 py-2">{ASSESSMENT_TYPE_LABELS[type]}</td>
                    <td className="px-3 py-2">{Math.round(weights[type] * 100)}%</td>
                    <td className="px-3 py-2 text-muted-foreground">Quiz score</td>
                  </tr>
                ))}
                <tr className="border-b">
                  <td className="px-3 py-2">{ASSESSMENT_TYPE_LABELS.MIDTERM_PROJECT}</td>
                  <td className="px-3 py-2">
                    {Math.round(weights.MIDTERM_PROJECT * 100)}%
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">Entered on Assessments page</td>
                </tr>
                <tr className="border-b last:border-0">
                  <td className="px-3 py-2">{ASSESSMENT_TYPE_LABELS.FINAL_EXAM}</td>
                  <td className="px-3 py-2">{Math.round(weights.FINAL_EXAM * 100)}%</td>
                  <td className="px-3 py-2 text-muted-foreground">Entered on Assessments page</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-md bg-muted/50 px-3 py-2 font-mono text-xs leading-relaxed">
            {buildFinalGradeFormula(gradingScale)}
          </div>

          <p className="text-xs text-muted-foreground">
            Letter grades:{" "}
            {[...letterBands]
              .sort((a, b) => b.minPct - a.minPct)
              .map((band) => `${band.letter} ≥ ${band.minPct}%`)
              .join(", ")}
          </p>
        </CardContent>
      )}
    </Card>
  );
}
