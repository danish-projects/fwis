ALTER TABLE "academic_years"
ADD COLUMN "docs_drive_folder_id" TEXT;

ALTER TABLE "schools"
DROP COLUMN IF EXISTS "lesson_plan_drive_root_folder_id";
