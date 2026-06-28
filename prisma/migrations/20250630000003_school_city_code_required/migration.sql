-- Enforce city_code NOT NULL + unique after backfill script populates values.
ALTER TABLE "schools" ALTER COLUMN "city_code" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "schools_city_code_key" ON "schools"("city_code");
