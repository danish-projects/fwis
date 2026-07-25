-- Keep only: NIGRA, PRINCIPAL, SCHOOL_ADMIN, TEACHER, SUBSTITUTE, READ_ONLY.
-- Remap removed roles: SUPER_ADMIN → NIGRA, ADMIN → SCHOOL_ADMIN.

INSERT INTO "roles" ("code", "name") VALUES
  ('NIGRA', 'Nigra'),
  ('PRINCIPAL', 'Principal'),
  ('SCHOOL_ADMIN', 'School Admin'),
  ('TEACHER', 'Teacher'),
  ('SUBSTITUTE', 'Substitute'),
  ('READ_ONLY', 'Read Only')
ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name";

-- Remap user_roles: SUPER_ADMIN → NIGRA
UPDATE "user_roles" AS ur
SET "role_id" = nigra.id
FROM "roles" AS old_role
CROSS JOIN "roles" AS nigra
WHERE ur."role_id" = old_role.id
  AND old_role."code" = 'SUPER_ADMIN'
  AND nigra."code" = 'NIGRA'
  AND NOT EXISTS (
    SELECT 1 FROM "user_roles" AS existing
    WHERE existing."user_id" = ur."user_id" AND existing."role_id" = nigra.id
  );

DELETE FROM "user_roles" AS ur
USING "roles" AS r
WHERE ur."role_id" = r.id AND r."code" = 'SUPER_ADMIN';

-- Remap user_roles: ADMIN → SCHOOL_ADMIN
UPDATE "user_roles" AS ur
SET "role_id" = school_admin.id
FROM "roles" AS old_role
CROSS JOIN "roles" AS school_admin
WHERE ur."role_id" = old_role.id
  AND old_role."code" = 'ADMIN'
  AND school_admin."code" = 'SCHOOL_ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM "user_roles" AS existing
    WHERE existing."user_id" = ur."user_id" AND existing."role_id" = school_admin.id
  );

DELETE FROM "user_roles" AS ur
USING "roles" AS r
WHERE ur."role_id" = r.id AND r."code" = 'ADMIN';

-- Remap staff.role_id: SUPER_ADMIN → NIGRA, ADMIN → SCHOOL_ADMIN
UPDATE "staff" AS s
SET "role_id" = nigra.id
FROM "roles" AS old_role
CROSS JOIN "roles" AS nigra
WHERE s."role_id" = old_role.id
  AND old_role."code" = 'SUPER_ADMIN'
  AND nigra."code" = 'NIGRA';

UPDATE "staff" AS s
SET "role_id" = school_admin.id
FROM "roles" AS old_role
CROSS JOIN "roles" AS school_admin
WHERE s."role_id" = old_role.id
  AND old_role."code" = 'ADMIN'
  AND school_admin."code" = 'SCHOOL_ADMIN';

DELETE FROM "roles" WHERE "code" IN ('SUPER_ADMIN', 'ADMIN');

-- Rebuild enum without SUPER_ADMIN / ADMIN
CREATE TYPE "UserRoleCode_new" AS ENUM (
  'NIGRA',
  'PRINCIPAL',
  'SCHOOL_ADMIN',
  'TEACHER',
  'SUBSTITUTE',
  'READ_ONLY'
);

ALTER TABLE "roles"
  ALTER COLUMN "code" TYPE "UserRoleCode_new"
  USING ("code"::text::"UserRoleCode_new");

DROP TYPE "UserRoleCode";
ALTER TYPE "UserRoleCode_new" RENAME TO "UserRoleCode";
