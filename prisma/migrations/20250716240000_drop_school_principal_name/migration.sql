-- Remove legacy principal display field from schools (principal is a login/staff role).

ALTER TABLE "schools" DROP COLUMN IF EXISTS "principal_name";
