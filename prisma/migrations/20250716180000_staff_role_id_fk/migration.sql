-- Drop staff_roles lookup; staff references roles.id instead.

ALTER TYPE "UserRoleCode" ADD VALUE IF NOT EXISTS 'NIGRA';
ALTER TYPE "UserRoleCode" ADD VALUE IF NOT EXISTS 'PRINCIPAL';
ALTER TYPE "UserRoleCode" ADD VALUE IF NOT EXISTS 'ADMIN';
ALTER TYPE "UserRoleCode" ADD VALUE IF NOT EXISTS 'SUBSTITUTE';

INSERT INTO "roles" ("code", "name") VALUES
  ('NIGRA', 'Nigra'),
  ('PRINCIPAL', 'Principal'),
  ('ADMIN', 'Admin'),
  ('SUBSTITUTE', 'Substitute')
ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name";

ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "role_id" INTEGER;

UPDATE "staff" AS s
SET "role_id" = r."id"
FROM "roles" AS r
WHERE s."role_id" IS NULL
  AND r."code"::text = s."staff_role";

UPDATE "staff" SET "role_id" = (SELECT "id" FROM "roles" WHERE "code" = 'TEACHER')
WHERE "role_id" IS NULL;

ALTER TABLE "staff" ALTER COLUMN "role_id" SET NOT NULL;

ALTER TABLE "staff" DROP CONSTRAINT IF EXISTS "staff_staff_role_fkey";
ALTER TABLE "staff" DROP COLUMN IF EXISTS "staff_role";

ALTER TABLE "staff"
  ADD CONSTRAINT "staff_role_id_fkey"
  FOREIGN KEY ("role_id") REFERENCES "roles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TABLE IF EXISTS "staff_roles";
