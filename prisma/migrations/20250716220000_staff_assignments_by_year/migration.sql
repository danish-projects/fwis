-- Year-scoped staff role + classroom assignments.

CREATE TABLE "staff_assignments" (
    "id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "academic_year_school_id" UUID NOT NULL,
    "role_id" INTEGER NOT NULL,
    "classroom_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_assignments_pkey" PRIMARY KEY ("id")
);

-- Backfill one assignment per staff × academic_year_school for their school.
INSERT INTO "staff_assignments" (
  "id",
  "staff_id",
  "academic_year_school_id",
  "role_id",
  "classroom_id",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  s."id",
  ays."id",
  s."role_id",
  sc."classroom_id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "staff" AS s
INNER JOIN "academic_year_schools" AS ays
  ON ays."school_id" = s."school_id"
 AND ays."deleted_at" IS NULL
LEFT JOIN "staff_classrooms" AS sc
  ON sc."staff_id" = s."id"
WHERE s."deleted_at" IS NULL;

CREATE UNIQUE INDEX "staff_assignments_staff_id_academic_year_school_id_key"
  ON "staff_assignments"("staff_id", "academic_year_school_id");

CREATE UNIQUE INDEX "staff_assignments_academic_year_school_id_classroom_id_key"
  ON "staff_assignments"("academic_year_school_id", "classroom_id");

CREATE INDEX "staff_assignments_academic_year_school_id_idx"
  ON "staff_assignments"("academic_year_school_id");

ALTER TABLE "staff_assignments"
  ADD CONSTRAINT "staff_assignments_staff_id_fkey"
  FOREIGN KEY ("staff_id") REFERENCES "staff"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "staff_assignments"
  ADD CONSTRAINT "staff_assignments_academic_year_school_id_fkey"
  FOREIGN KEY ("academic_year_school_id") REFERENCES "academic_year_schools"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "staff_assignments"
  ADD CONSTRAINT "staff_assignments_role_id_fkey"
  FOREIGN KEY ("role_id") REFERENCES "roles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "staff_assignments"
  ADD CONSTRAINT "staff_assignments_classroom_id_fkey"
  FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "staff" DROP CONSTRAINT IF EXISTS "staff_role_id_fkey";
ALTER TABLE "staff" DROP COLUMN IF EXISTS "role_id";

DROP TABLE IF EXISTS "staff_classrooms";
