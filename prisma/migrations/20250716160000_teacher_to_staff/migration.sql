-- Rename Teacher -> Staff and introduce staff roles (Nigra, Principal, Teacher, Admin, Substitute).

-- 1. Staff roles lookup table
CREATE TABLE "staff_roles" (
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "staff_roles_pkey" PRIMARY KEY ("code")
);

INSERT INTO "staff_roles" ("code", "label", "sort_order") VALUES
  ('NIGRA', 'Nigra', 1),
  ('PRINCIPAL', 'Principal', 2),
  ('TEACHER', 'Teacher', 3),
  ('ADMIN', 'Admin', 4),
  ('SUBSTITUTE', 'Substitute', 5);

-- 2. Rename teachers -> staff
ALTER TABLE "teachers" RENAME TO "staff";
ALTER TABLE "staff" RENAME CONSTRAINT "teachers_pkey" TO "staff_pkey";
ALTER TABLE "staff" RENAME CONSTRAINT "teachers_school_id_fkey" TO "staff_school_id_fkey";
ALTER TABLE "staff" RENAME CONSTRAINT "teachers_user_id_fkey" TO "staff_user_id_fkey";
ALTER TABLE "staff" RENAME CONSTRAINT "teachers_gender_fkey" TO "staff_gender_fkey";
ALTER INDEX "teachers_user_id_key" RENAME TO "staff_user_id_key";
ALTER INDEX "teachers_school_id_email_key" RENAME TO "staff_school_id_email_key";

-- 3. Add staff_role, backfill from is_substitute, drop is_substitute
ALTER TABLE "staff" ADD COLUMN "staff_role" TEXT NOT NULL DEFAULT 'TEACHER';

UPDATE "staff" SET "staff_role" = 'SUBSTITUTE' WHERE "is_substitute" = true;

ALTER TABLE "staff" DROP COLUMN "is_substitute";

ALTER TABLE "staff"
  ADD CONSTRAINT "staff_staff_role_fkey"
  FOREIGN KEY ("staff_role") REFERENCES "staff_roles"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Rename teacher_classrooms -> staff_classrooms
ALTER TABLE "teacher_classrooms" RENAME TO "staff_classrooms";
ALTER TABLE "staff_classrooms" RENAME COLUMN "teacher_id" TO "staff_id";
ALTER TABLE "staff_classrooms" RENAME CONSTRAINT "teacher_classrooms_pkey" TO "staff_classrooms_pkey";
ALTER TABLE "staff_classrooms" RENAME CONSTRAINT "teacher_classrooms_teacher_id_fkey" TO "staff_classrooms_staff_id_fkey";
ALTER TABLE "staff_classrooms" RENAME CONSTRAINT "teacher_classrooms_classroom_id_fkey" TO "staff_classrooms_classroom_id_fkey";
ALTER INDEX "teacher_classrooms_teacher_id_key" RENAME TO "staff_classrooms_staff_id_key";

-- 5. Rename student_enrollments.teacher_id -> staff_id
ALTER TABLE "student_enrollments" RENAME COLUMN "teacher_id" TO "staff_id";
ALTER TABLE "student_enrollments" RENAME CONSTRAINT "student_enrollments_teacher_id_fkey" TO "student_enrollments_staff_id_fkey";
