-- Move legacy contact/address data into structured columns, then drop old fields.

UPDATE "students"
SET "email_address" = "parent_email"
WHERE ("email_address" IS NULL OR "email_address" = '')
  AND "parent_email" IS NOT NULL
  AND "parent_email" <> '';

UPDATE "students"
SET "street_address" = "address"
WHERE ("street_address" IS NULL OR "street_address" = '')
  AND "address" IS NOT NULL
  AND "address" <> '';

UPDATE "students"
SET "father_mobile_whatsapp_number" = "parent_phone",
    "father_mobile_whatsapp_hash" = "parent_phone_hash"
WHERE ("father_mobile_whatsapp_number" IS NULL OR "father_mobile_whatsapp_number" = '')
  AND "parent_phone" IS NOT NULL
  AND "parent_phone" <> '';

UPDATE "students"
SET "father_guardian_first_name" = "parent_name"
WHERE ("father_guardian_first_name" IS NULL OR "father_guardian_first_name" = '')
  AND ("father_guardian_last_name" IS NULL OR "father_guardian_last_name" = '')
  AND "parent_name" IS NOT NULL
  AND "parent_name" <> '';

DROP INDEX IF EXISTS "students_parent_phone_hash_idx";

ALTER TABLE "students" DROP COLUMN IF EXISTS "parent_name";
ALTER TABLE "students" DROP COLUMN IF EXISTS "parent_phone";
ALTER TABLE "students" DROP COLUMN IF EXISTS "parent_phone_hash";
ALTER TABLE "students" DROP COLUMN IF EXISTS "parent_email";
ALTER TABLE "students" DROP COLUMN IF EXISTS "address";
