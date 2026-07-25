-- Structured registration fields for students (email, address parts, father/mother contacts).
-- Existing first_name / last_name / gender / date_of_birth cover student_first_name etc.

ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "email_address" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "street_address" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "state_province" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "zip_postal_code" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "country" TEXT;

ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "father_guardian_first_name" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "father_guardian_last_name" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "father_parental_responsibility" BOOLEAN;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "father_mobile_whatsapp_number" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "father_mobile_whatsapp_hash" TEXT;

ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "mother_guardian_first_name" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "mother_guardian_last_name" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "mother_parental_responsibility" BOOLEAN;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "mother_mobile_whatsapp_number" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "mother_mobile_whatsapp_hash" TEXT;

-- Backfill email from legacy parent_email (ciphertext copies as-is).
UPDATE "students"
SET "email_address" = "parent_email"
WHERE "email_address" IS NULL
  AND "parent_email" IS NOT NULL
  AND "parent_email" <> '';

CREATE INDEX IF NOT EXISTS "students_father_mobile_whatsapp_hash_idx"
  ON "students"("father_mobile_whatsapp_hash");

CREATE INDEX IF NOT EXISTS "students_mother_mobile_whatsapp_hash_idx"
  ON "students"("mother_mobile_whatsapp_hash");
