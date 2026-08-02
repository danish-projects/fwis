-- Allow one app login (user_id) to be linked to multiple staff records.
DROP INDEX IF EXISTS "staff_user_id_key";
CREATE INDEX IF NOT EXISTS "staff_user_id_idx" ON "staff" ("user_id");
