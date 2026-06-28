-- Replace sunday_number with lesson_plan_number (Week 1, Week 2, … for attendance-needed days only)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'academic_calendar_days'
      AND column_name = 'sunday_number'
  ) THEN
    ALTER TABLE "academic_calendar_days"
      RENAME COLUMN "sunday_number" TO "lesson_plan_number";
  END IF;
END $$;

-- Allow null before clearing non-attendance days
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
