-- Track which school created an unenrolled student record (tenant scoping).
ALTER TABLE "students" ADD COLUMN "origin_school_id" UUID;

ALTER TABLE "students"
  ADD CONSTRAINT "students_origin_school_id_fkey"
  FOREIGN KEY ("origin_school_id") REFERENCES "schools"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "students_origin_school_id_idx" ON "students"("origin_school_id");
