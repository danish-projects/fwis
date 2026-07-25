-- Retarget teachers.user_id from app_users.id (UUID) to app_users.user_id (login handle).

ALTER TABLE "teachers" DROP CONSTRAINT IF EXISTS "teachers_user_id_fkey";
DROP INDEX IF EXISTS "teachers_user_id_key";

ALTER TABLE "teachers" ADD COLUMN IF NOT EXISTS "user_id_login" TEXT;

UPDATE "teachers" AS t
SET "user_id_login" = a."user_id"
FROM "app_users" AS a
WHERE t."user_id" IS NOT NULL
  AND a."id" = t."user_id";

ALTER TABLE "teachers" DROP COLUMN IF EXISTS "user_id";
ALTER TABLE "teachers" RENAME COLUMN "user_id_login" TO "user_id";

CREATE UNIQUE INDEX "teachers_user_id_key" ON "teachers"("user_id");

ALTER TABLE "teachers"
  ADD CONSTRAINT "teachers_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "app_users"("user_id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
