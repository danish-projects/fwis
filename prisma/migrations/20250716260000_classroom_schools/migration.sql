-- Split classrooms into shared master + per-school links (classroom_schools).

CREATE TABLE "classroom_schools" (
    "id" UUID NOT NULL,
    "classroom_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "classroom_schools_pkey" PRIMARY KEY ("id")
);

-- One link per existing classroom row (pre-dedupe).
INSERT INTO "classroom_schools" (
  "id", "classroom_id", "school_id", "is_active", "created_at", "updated_at", "deleted_at"
)
SELECT
  gen_random_uuid(),
  c."id",
  c."school_id",
  c."is_active",
  c."created_at",
  c."updated_at",
  c."deleted_at"
FROM "classrooms" c;

-- Canonical classroom per grade+section (prefer non-deleted, then oldest).
CREATE TEMP TABLE "_classroom_canonical" AS
SELECT DISTINCT ON ("grade_id", "section_id")
  "id" AS canonical_id,
  "grade_id",
  "section_id"
FROM "classrooms"
ORDER BY
  "grade_id",
  "section_id",
  ("deleted_at" IS NOT NULL),
  "created_at" ASC,
  "id" ASC;

CREATE TEMP TABLE "_classroom_remap" AS
SELECT
  c."id" AS old_id,
  canon.canonical_id AS new_id
FROM "classrooms" c
JOIN "_classroom_canonical" canon
  ON canon."grade_id" = c."grade_id"
 AND canon."section_id" = c."section_id";

-- Remap FKs to canonical classroom ids.
UPDATE "student_enrollments" e
SET "classroom_id" = r.new_id
FROM "_classroom_remap" r
WHERE e."classroom_id" = r.old_id
  AND r.old_id <> r.new_id;

UPDATE "staff_assignments" a
SET "classroom_id" = r.new_id
FROM "_classroom_remap" r
WHERE a."classroom_id" = r.old_id
  AND r.old_id <> r.new_id;

UPDATE "classroom_schools" cs
SET "classroom_id" = r.new_id
FROM "_classroom_remap" r
WHERE cs."classroom_id" = r.old_id
  AND r.old_id <> r.new_id;

-- Deduplicate classroom_schools after remap (keep one row per classroom+school).
DELETE FROM "classroom_schools" cs
WHERE cs."id" IN (
  SELECT id FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "classroom_id", "school_id"
        ORDER BY ("deleted_at" IS NOT NULL), "created_at" ASC, "id" ASC
      ) AS rn
    FROM "classroom_schools"
  ) ranked
  WHERE ranked.rn > 1
);

-- Drop duplicate classroom master rows.
DELETE FROM "classrooms" c
WHERE c."id" IN (
  SELECT old_id FROM "_classroom_remap" WHERE old_id <> new_id
);

-- Drop school-scoped unique + FK, then school_id column.
ALTER TABLE "classrooms" DROP CONSTRAINT IF EXISTS "classrooms_school_id_grade_id_section_id_key";
ALTER TABLE "classrooms" DROP CONSTRAINT IF EXISTS "classrooms_school_id_fkey";
DROP INDEX IF EXISTS "classrooms_school_id_grade_id_section_id_key";
ALTER TABLE "classrooms" DROP COLUMN "school_id";

CREATE UNIQUE INDEX "classrooms_grade_id_section_id_key"
  ON "classrooms"("grade_id", "section_id");

CREATE UNIQUE INDEX "classroom_schools_classroom_id_school_id_key"
  ON "classroom_schools"("classroom_id", "school_id");

CREATE INDEX "classroom_schools_school_id_deleted_at_idx"
  ON "classroom_schools"("school_id", "deleted_at");

ALTER TABLE "classroom_schools"
  ADD CONSTRAINT "classroom_schools_classroom_id_fkey"
  FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "classroom_schools"
  ADD CONSTRAINT "classroom_schools_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
