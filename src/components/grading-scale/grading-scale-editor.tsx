"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateGradingScale } from "@/actions/grading-scale";
import type { GradingScaleConfig } from "@/lib/grades/grading-scale-types";
import {
  ASSESSMENT_WEIGHT_KEYS,
  weightsToPercentages,
} from "@/lib/grades/grading-scale-types";
import { buildFinalGradeFormula } from "@/lib/grades/calculate-final-grade";
import {
  ASSESSMENT_TYPE_LABELS,
} from "@/lib/validations/enrollment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const WEIGHT_FIELDS: { key: keyof GradingScaleConfig["weights"]; label: string }[] = [
  { key: "attendance", label: "Attendance" },
  { key: "behavior", label: "Behavior" },
  ...ASSESSMENT_WEIGHT_KEYS.map((key) => ({
    key,
    label: ASSESSMENT_TYPE_LABELS[key],
  })),
];

type GradingScaleEditorProps = {
  initialScale: GradingScaleConfig;
  canEdit: boolean;
};

export function GradingScaleEditor({ initialScale, canEdit }: GradingScaleEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [weightsPct, setWeightsPct] = useState(() =>
    weightsToPercentages(initialScale.weights)
  );
  const [letterBands, setLetterBands] = useState(initialScale.letterBands);
  const [passMinPct, setPassMinPct] = useState(initialScale.passMinPct);

  const weightTotal = useMemo(
    () =>
      Math.round(
        Object.values(weightsPct).reduce((sum, value) => sum + Number(value || 0), 0) *
          100
      ) / 100,
    [weightsPct]
  );

  const previewScale = useMemo(
    (): GradingScaleConfig => ({
      weights: Object.fromEntries(
        Object.entries(weightsPct).map(([key, value]) => [key, Number(value) / 100])
      ) as GradingScaleConfig["weights"],
      letterBands,
      passMinPct: Number(passMinPct),
    }),
    [weightsPct, letterBands, passMinPct]
  );

  function handleSave() {
    startTransition(async () => {
      try {
        const result = await updateGradingScale(previewScale);
        toast.success(
          `Grading scale saved · ${result.recomputed} student grade(s) recalculated`
        );
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Save failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      {!canEdit && (
        <p className="rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-900 dark:text-blue-100">
          View only — contact a Super Admin to change the grading scale.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Component weights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Weights must total <strong>100%</strong>. Current total:{" "}
            <strong className={weightTotal === 100 ? "text-emerald-600" : "text-red-600"}>
              {weightTotal}%
            </strong>
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {WEIGHT_FIELDS.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <label htmlFor={`weight-${key}`} className="text-sm font-medium">
                  {label}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id={`weight-${key}`}
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={weightsPct[key] ?? ""}
                    disabled={!canEdit || isPending}
                    onChange={(e) =>
                      setWeightsPct((prev) => ({
                        ...prev,
                        [key]: e.target.value === "" ? 0 : Number(e.target.value),
                      }))
                    }
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Letter grades</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[360px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-3 py-2 font-medium">Letter</th>
                  <th className="px-3 py-2 font-medium">Minimum %</th>
                </tr>
              </thead>
              <tbody>
                {letterBands.map((band, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <Input
                        value={band.letter}
                        disabled={!canEdit || isPending}
                        onChange={(e) =>
                          setLetterBands((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, letter: e.target.value } : item
                            )
                          )
                        }
                        className="h-9 w-24"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={band.minPct}
                        disabled={!canEdit || isPending}
                        onChange={(e) =>
                          setLetterBands((prev) =>
                            prev.map((item, i) =>
                              i === index
                                ? { ...item, minPct: Number(e.target.value) }
                                : item
                            )
                          )
                        }
                        className="h-9 w-28"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-1">
            <label htmlFor="passMinPct" className="text-sm font-medium">
              Pass threshold (%)
            </label>
            <Input
              id="passMinPct"
              type="number"
              min={0}
              max={100}
              value={passMinPct}
              disabled={!canEdit || isPending}
              onChange={(e) => setPassMinPct(Number(e.target.value))}
              className="h-9 max-w-[120px]"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Formula preview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-xs leading-relaxed text-muted-foreground">
            {buildFinalGradeFormula(previewScale)}
          </p>
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isPending || weightTotal !== 100}>
            {isPending ? "Saving & recalculating…" : "Save Grading Scale"}
          </Button>
        </div>
      )}
    </div>
  );
}
