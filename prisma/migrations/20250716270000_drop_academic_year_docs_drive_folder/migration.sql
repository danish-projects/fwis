-- Academic year Drive folders are resolved under FWIS Docs parent from env
-- (GOOGLE_DRIVE_FWIS_DOCS_FOLDER_ID) by academic year name.
ALTER TABLE "academic_years" DROP COLUMN IF EXISTS "docs_drive_folder_id";
