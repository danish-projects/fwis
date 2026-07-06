-- School readable codes (FWIS-HOU, FWIS-CHI, ...)
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "code" TEXT;

UPDATE "schools"
SET "code" = 'FWIS-' || "city_code"
WHERE "code" IS NULL;

ALTER TABLE "schools" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "schools_code_key" ON "schools"("code");

-- Academic year school junction + consolidate duplicate year rows per name
CREATE TABLE IF NOT EXISTS "academic_year_schools" (
  "id" UUID NOT NULL,
  "academic_year_id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "docs_drive_folder_id" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),

  CONSTRAINT "academic_year_schools_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "academic_year_schools_academic_year_id_school_id_key"
  ON "academic_year_schools"("academic_year_id", "school_id");
CREATE INDEX IF NOT EXISTS "academic_year_schools_school_id_deleted_at_idx"
  ON "academic_year_schools"("school_id", "deleted_at");

-- One canonical academic year id per name (lexicographically smallest uuid)
CREATE TEMP TABLE "_year_canonical" AS
SELECT DISTINCT ON ("name") "name", "id" AS "canonical_id"
FROM "academic_years"
WHERE "deleted_at" IS NULL
ORDER BY "name", "id"::text;

-- School links preserve old academic_year row ids for FK remapping
INSERT INTO "academic_year_schools" (
  "id",
  "academic_year_id",
  "school_id",
  "docs_drive_folder_id",
  "is_active",
  "created_at",
  "updated_at",
  "deleted_at"
)
SELECT
  ay."id",
  c."canonical_id",
  ay."school_id",
  ay."docs_drive_folder_id",
  ay."is_active",
  ay."created_at",
  ay."updated_at",
  ay."deleted_at"
FROM "academic_years" ay
JOIN "_year_canonical" c ON c."name" = ay."name"
ON CONFLICT ("id") DO NOTHING;

-- Point calendar/enrollment FK columns at junction ids before removing duplicate years
ALTER TABLE "academic_calendar_days"
  RENAME COLUMN "academic_year_id" TO "academic_year_school_id";

ALTER TABLE "student_enrollments"
  RENAME COLUMN "academic_year_id" TO "academic_year_school_id";

ALTER TABLE "academic_calendar_days" DROP CONSTRAINT IF EXISTS "academic_calendar_days_academic_year_id_fkey";
ALTER TABLE "student_enrollments" DROP CONSTRAINT IF EXISTS "student_enrollments_academic_year_id_fkey";
DROP INDEX IF EXISTS "student_enrollments_student_id_academic_year_id_school_id_key";
DROP INDEX IF EXISTS "student_enrollments_school_id_academic_year_id_idx";
DROP INDEX IF EXISTS "student_enrollments_classroom_id_academic_year_id_status_idx";

-- Remove duplicate academic year rows; keep canonical rows only
DELETE FROM "academic_years" ay
WHERE NOT EXISTS (
  SELECT 1 FROM "_year_canonical" c
  WHERE c."canonical_id" = ay."id"
);

ALTER TABLE "academic_years" DROP CONSTRAINT IF EXISTS "academic_years_school_id_name_key";
ALTER TABLE "academic_years" DROP CONSTRAINT IF EXISTS "academic_years_school_id_fkey";
DROP INDEX IF EXISTS "academic_years_school_id_deleted_at_idx";

ALTER TABLE "academic_years" DROP COLUMN IF EXISTS "school_id";
ALTER TABLE "academic_years" DROP COLUMN IF EXISTS "docs_drive_folder_id";
ALTER TABLE "academic_years" DROP COLUMN IF EXISTS "is_active";

CREATE UNIQUE INDEX IF NOT EXISTS "academic_years_name_key" ON "academic_years"("name");
CREATE INDEX IF NOT EXISTS "academic_years_deleted_at_idx" ON "academic_years"("deleted_at");

ALTER TABLE "academic_year_schools" DROP CONSTRAINT IF EXISTS "academic_year_schools_academic_year_id_fkey";
ALTER TABLE "academic_year_schools"
  ADD CONSTRAINT "academic_year_schools_academic_year_id_fkey"
  FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "academic_year_schools" DROP CONSTRAINT IF EXISTS "academic_year_schools_school_id_fkey";
ALTER TABLE "academic_year_schools"
  ADD CONSTRAINT "academic_year_schools_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "academic_calendar_days" DROP CONSTRAINT IF EXISTS "academic_calendar_days_academic_year_school_id_fkey";
ALTER TABLE "academic_calendar_days"
  ADD CONSTRAINT "academic_calendar_days_academic_year_school_id_fkey"
  FOREIGN KEY ("academic_year_school_id") REFERENCES "academic_year_schools"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student_enrollments" DROP CONSTRAINT IF EXISTS "student_enrollments_academic_year_school_id_fkey";
ALTER TABLE "student_enrollments"
  ADD CONSTRAINT "student_enrollments_academic_year_school_id_fkey"
  FOREIGN KEY ("academic_year_school_id") REFERENCES "academic_year_schools"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "student_enrollments_student_id_academic_year_school_id_key"
  ON "student_enrollments"("student_id", "academic_year_school_id");
CREATE INDEX IF NOT EXISTS "student_enrollments_school_id_academic_year_school_id_idx"
  ON "student_enrollments"("school_id", "academic_year_school_id");
CREATE INDEX IF NOT EXISTS "student_enrollments_classroom_id_academic_year_school_id_status_idx"
  ON "student_enrollments"("classroom_id", "academic_year_school_id", "status");
