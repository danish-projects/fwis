-- Behavior scoring system migration: clear legacy data, replace lookup values,
-- remove stored enrollment behavior scores and behavior_history table.

-- 1. Clear legacy behavior records
DROP TABLE IF EXISTS "behavior_history";
UPDATE "attendance" SET "behavior_value" = NULL WHERE "behavior_value" IS NOT NULL;

-- 2. Remove obsolete behavior rating codes
DELETE FROM "behavior_values"
WHERE "code" NOT IN (
  'OUTSTANDING',
  'EXCELLENT',
  'VERY_GOOD',
  'MEETS_EXPECTATIONS',
  'NEEDS_IMPROVEMENT',
  'UNSATISFACTORY'
);

-- 3. Seed new behavior rating lookup values
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

-- 4. Drop stored enrollment behavior score (now calculated dynamically)
ALTER TABLE "student_enrollments" DROP COLUMN IF EXISTS "behavior_score";
