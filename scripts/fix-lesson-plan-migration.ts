/**
 * Repairs a partially applied lesson_plan_number migration and marks it resolved.
 * Usage: npx dotenv -e .env.local -- tsx scripts/fix-lesson-plan-migration.ts
 */
import { config } from "dotenv";
import { execSync } from "node:child_process";
import { createPrismaClient } from "../src/lib/prisma";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("Missing DATABASE_URL or DIRECT_URL");

const prisma = createPrismaClient(url);

const REPAIR_SQL = `
ALTER TABLE "academic_calendar_days"
  ALTER COLUMN "lesson_plan_number" DROP NOT NULL;

UPDATE "academic_calendar_days"
SET "lesson_plan_number" = NULL
WHERE "session_type" IN ('PARENT_MEETING', 'HOLIDAY', 'GRADUATION', 'MAKEUP');

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY academic_year_id
      ORDER BY date ASC
    ) AS week_num
  FROM "academic_calendar_days"
  WHERE "session_type" IN (
    'INSTRUCTIONAL',
    'QUIZ_1',
    'QUIZ_2',
    'QUIZ_3',
    'QUIZ_4',
    'QUIZ_5',
    'MIDTERM_PROJECT',
    'FINAL_EXAM'
  )
  AND "deleted_at" IS NULL
)
UPDATE "academic_calendar_days" AS d
SET "lesson_plan_number" = ranked.week_num
FROM ranked
WHERE d.id = ranked.id;
`;

async function main() {
  console.log("Repairing lesson_plan_number column...");
  await prisma.$executeRawUnsafe(REPAIR_SQL);

  const sample = await prisma.$queryRaw<
    Array<{ session_type: string; lesson_plan_number: number | null; cnt: bigint }>
  >`
    SELECT session_type, lesson_plan_number, COUNT(*)::bigint AS cnt
    FROM academic_calendar_days
    GROUP BY session_type, lesson_plan_number
    ORDER BY session_type, lesson_plan_number NULLS FIRST
    LIMIT 20
  `;
  console.log("Sample counts:", sample);

  console.log("Marking migration as applied...");
  execSync(
    "npx dotenv -e .env.local -- prisma migrate resolve --applied 20250629000000_lesson_plan_number",
    { stdio: "inherit" }
  );

  console.log("Done. Run npm run db:deploy to verify.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
