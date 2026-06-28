-- Resolve duplicate city/state rows (including soft-deleted) before unique index
WITH "ranked" AS (
  SELECT
    "id",
    "city",
    ROW_NUMBER() OVER (PARTITION BY "city", "state" ORDER BY "created_at" ASC) AS "rn"
  FROM "schools"
)
UPDATE "schools" AS "s"
SET
  "city" = "r"."city" || ' (' || LEFT("s"."id"::text, 8) || ')',
  "deleted_at" = COALESCE("s"."deleted_at", NOW())
FROM "ranked" AS "r"
WHERE "s"."id" = "r"."id"
  AND "r"."rn" > 1;

DROP INDEX IF EXISTS "schools_state_city_idx";
CREATE UNIQUE INDEX "schools_city_state_key" ON "schools"("city", "state");
