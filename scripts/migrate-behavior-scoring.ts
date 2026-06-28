/**
 * Migrates to the new behavior scoring system:
 * - Clears legacy behavior records and history
 * - Replaces behavior lookup values
 * - Drops enrollment.behavior_score column
 * - Recomputes final grades for all active enrollments
 *
 * Usage: npx dotenv -e .env.local -- tsx scripts/migrate-behavior-scoring.ts
 */
import { config } from "dotenv";
import { createPrismaClient } from "../src/lib/prisma";
import {
  computeAndSaveEnrollmentGrade,
  recomputeClassroomRanks,
} from "../src/lib/grades/compute-enrollment-grade";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("Missing DATABASE_URL or DIRECT_URL");

const prisma = createPrismaClient(url);

const BATCH_SIZE = 25;

const MIGRATION_SQL = `
DROP TABLE IF EXISTS "behavior_history";
UPDATE "attendance" SET "behavior_value" = NULL WHERE "behavior_value" IS NOT NULL;

DELETE FROM "behavior_values"
WHERE "code" NOT IN (
  'OUTSTANDING',
  'EXCELLENT',
  'VERY_GOOD',
  'MEETS_EXPECTATIONS',
  'NEEDS_IMPROVEMENT',
  'UNSATISFACTORY'
);

INSERT INTO "behavior_values" ("code", "label", "sort_order") VALUES
  ('OUTSTANDING', 'Outstanding', 1),
  ('EXCELLENT', 'Excellent', 2),
  ('VERY_GOOD', 'Very Good', 3),
  ('MEETS_EXPECTATIONS', 'Meets Expectations', 4),
  ('NEEDS_IMPROVEMENT', 'Needs Improvement', 5),
  ('UNSATISFACTORY', 'Unsatisfactory', 6)
ON CONFLICT ("code") DO UPDATE SET
  "label" = EXCLUDED."label",
  "sort_order" = EXCLUDED."sort_order";

ALTER TABLE "student_enrollments" DROP COLUMN IF EXISTS "behavior_score";
`;

async function main() {
  console.log("Applying behavior scoring migration...");

  await prisma.$executeRawUnsafe(MIGRATION_SQL);

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    select: { id: true },
  });

  console.log(`Recomputing grades for ${enrollments.length} active enrollment(s)...`);

  const classroomKeys = new Set<string>();
  for (let i = 0; i < enrollments.length; i += BATCH_SIZE) {
    const batch = enrollments.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (enrollment) => {
        const metrics = await computeAndSaveEnrollmentGrade(enrollment.id, {
          skipRankRecompute: true,
        });
        if (metrics) {
          classroomKeys.add(`${metrics.classroomId}:${metrics.academicYearId}`);
        }
      })
    );
    console.log(
      `  Processed ${Math.min(i + BATCH_SIZE, enrollments.length)}/${enrollments.length} enrollments`
    );
  }

  console.log(`Re-ranking ${classroomKeys.size} classroom(s)...`);
  for (const key of classroomKeys) {
    const [classroomId, academicYearId] = key.split(":");
    await recomputeClassroomRanks(classroomId, academicYearId);
  }

  console.log("Behavior scoring migration complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
