import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  ASSESSMENT_WEIGHT_KEYS,
  DEFAULT_GRADING_SCALE,
  GRADING_SCALE_ID,
  type GradingScaleConfig,
  type GradingScaleWeights,
  type LetterBand,
} from "@/lib/grades/grading-scale-types";

function parseWeights(raw: unknown): GradingScaleWeights {
  const base = { ...DEFAULT_GRADING_SCALE.weights };
  if (!raw || typeof raw !== "object") return base;

  const record = raw as Record<string, unknown>;
  for (const key of Object.keys(base) as (keyof GradingScaleWeights)[]) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      base[key] = value;
    }
  }
  return base;
}

function parseLetterBands(raw: unknown): LetterBand[] {
  if (!Array.isArray(raw)) return DEFAULT_GRADING_SCALE.letterBands;

  const bands = raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const band = item as Record<string, unknown>;
      if (typeof band.letter !== "string" || typeof band.minPct !== "number") {
        return null;
      }
      return { letter: band.letter, minPct: band.minPct };
    })
    .filter((band): band is LetterBand => band !== null);

  return bands.length > 0 ? bands : DEFAULT_GRADING_SCALE.letterBands;
}

export async function loadGradingScale(): Promise<GradingScaleConfig> {
  const gradingScale = prisma.gradingScaleConfig;
  if (!gradingScale) {
    console.warn(
      "Prisma client missing gradingScaleConfig. Run `npm run db:generate` and restart the dev server."
    );
    return DEFAULT_GRADING_SCALE;
  }

  try {
    const row = await gradingScale.findUnique({
      where: { id: GRADING_SCALE_ID },
    });

    if (!row) return DEFAULT_GRADING_SCALE;

    return {
      weights: parseWeights(row.weights),
      letterBands: parseLetterBands(row.letterBands),
      passMinPct: Number(row.passMinPct),
    };
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : undefined;
    if (code === "P2021" || code === "P2022") {
      console.warn(
        "grading_scale_config table missing. Run `npm run db:deploy` to apply migrations."
      );
      return DEFAULT_GRADING_SCALE;
    }
    throw error;
  }
}

export const getGradingScale = unstable_cache(
  loadGradingScale,
  ["grading-scale-config"],
  { tags: ["grading-scale"] }
);

export function getAssessmentTypesForScale(): typeof ASSESSMENT_WEIGHT_KEYS {
  return ASSESSMENT_WEIGHT_KEYS;
}
