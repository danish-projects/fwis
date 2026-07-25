-- Year-level holiday Sundays shared across schools for calendar generation
CREATE TABLE "academic_year_holidays" (
    "id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "academic_year_holidays_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "academic_year_holidays_academic_year_id_date_key"
  ON "academic_year_holidays"("academic_year_id", "date");

CREATE INDEX "academic_year_holidays_academic_year_id_deleted_at_idx"
  ON "academic_year_holidays"("academic_year_id", "deleted_at");

ALTER TABLE "academic_year_holidays"
  ADD CONSTRAINT "academic_year_holidays_academic_year_id_fkey"
  FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
