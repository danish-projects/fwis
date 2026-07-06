-- FWIS Docs folder is per academic year (shared), not per school link
ALTER TABLE "academic_years" ADD COLUMN IF NOT EXISTS "docs_drive_folder_id" TEXT;

UPDATE "academic_years" ay
SET "docs_drive_folder_id" = sub."folder_id"
FROM (
  SELECT
    "academic_year_id",
    MAX("docs_drive_folder_id") AS "folder_id"
  FROM "academic_year_schools"
  WHERE "docs_drive_folder_id" IS NOT NULL
    AND "deleted_at" IS NULL
  GROUP BY "academic_year_id"
) sub
WHERE ay."id" = sub."academic_year_id"
  AND ay."docs_drive_folder_id" IS NULL;

ALTER TABLE "academic_year_schools" DROP COLUMN IF EXISTS "docs_drive_folder_id";
