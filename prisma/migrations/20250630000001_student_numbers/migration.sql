-- Student human-readable IDs: {CITY}-{GENDER}{SEQUENCE} e.g. HOU-B40

ALTER TABLE "schools" ADD COLUMN "city_code" TEXT;

ALTER TABLE "students" ADD COLUMN "student_number" TEXT;

CREATE TABLE "student_number_sequences" (
    "city_code" TEXT NOT NULL,
    "gender_prefix" TEXT NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "student_number_sequences_pkey" PRIMARY KEY ("city_code","gender_prefix")
);

CREATE UNIQUE INDEX "students_student_number_key" ON "students"("student_number");
