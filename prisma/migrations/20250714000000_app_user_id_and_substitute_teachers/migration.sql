-- Rename login column email → user_id and strip legacy @fwis.org suffixes.
ALTER TABLE "app_users" RENAME COLUMN "email" TO "user_id";
ALTER INDEX IF EXISTS "app_users_email_key" RENAME TO "app_users_user_id_key";

UPDATE "app_users"
SET "user_id" = regexp_replace(lower("user_id"), '@fwis\.org$', '', 'g');

-- Substitute teachers can cover all grades for their section (Boys or Girls).
ALTER TABLE "teachers" ADD COLUMN "is_substitute" BOOLEAN NOT NULL DEFAULT false;
