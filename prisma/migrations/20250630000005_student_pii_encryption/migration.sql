-- Encrypt student PII at rest: lookup hashes + text DOB column for ciphertext

ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "parent_phone_hash" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "date_of_birth_hash" TEXT;

ALTER TABLE "students"
  ALTER COLUMN "date_of_birth" TYPE TEXT
  USING (
    CASE
      WHEN "date_of_birth" IS NULL THEN NULL
      ELSE to_char("date_of_birth", 'YYYY-MM-DD')
    END
  );

CREATE INDEX IF NOT EXISTS "students_parent_phone_hash_idx"
  ON "students"("parent_phone_hash");

CREATE INDEX IF NOT EXISTS "students_date_of_birth_hash_idx"
  ON "students"("date_of_birth_hash");
