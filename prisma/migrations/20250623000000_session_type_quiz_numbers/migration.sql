-- Replace calendar session_type QUIZ with QUIZ_1 … QUIZ_5

INSERT INTO "session_types" ("code", "label", "sort_order") VALUES
  ('QUIZ_1', 'Quiz 1', 2),
  ('QUIZ_2', 'Quiz 2', 3),
  ('QUIZ_3', 'Quiz 3', 4),
  ('QUIZ_4', 'Quiz 4', 5),
  ('QUIZ_5', 'Quiz 5', 6)
ON CONFLICT ("code") DO UPDATE
SET "label" = EXCLUDED."label", "sort_order" = EXCLUDED."sort_order";

UPDATE "session_types" SET "sort_order" = 7 WHERE "code" = 'MIDTERM_PROJECT';
UPDATE "session_types" SET "sort_order" = 8 WHERE "code" = 'FINAL_EXAM';
UPDATE "session_types" SET "sort_order" = 9 WHERE "code" = 'PARENT_MEETING';
UPDATE "session_types" SET "sort_order" = 10 WHERE "code" = 'HOLIDAY';
UPDATE "session_types" SET "sort_order" = 11 WHERE "code" = 'GRADUATION';
UPDATE "session_types" SET "sort_order" = 12 WHERE "code" = 'MAKEUP';

-- Number existing quiz days by date within each academic year
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY academic_year_id ORDER BY date) AS rn
  FROM "academic_calendar_days"
  WHERE "session_type" = 'QUIZ'
)
UPDATE "academic_calendar_days" AS acd
SET "session_type" = CASE
  WHEN ranked.rn = 1 THEN 'QUIZ_1'
  WHEN ranked.rn = 2 THEN 'QUIZ_2'
  WHEN ranked.rn = 3 THEN 'QUIZ_3'
  WHEN ranked.rn = 4 THEN 'QUIZ_4'
  WHEN ranked.rn = 5 THEN 'QUIZ_5'
  ELSE 'QUIZ_1'
END
FROM ranked
WHERE acd.id = ranked.id;

DELETE FROM "session_types" WHERE "code" = 'QUIZ';
