-- Setup / lookup tables with FK constraints (replaces PostgreSQL enums for domain values)

-- Genders
CREATE TABLE "genders" (
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "genders_pkey" PRIMARY KEY ("code")
);

INSERT INTO "genders" ("code", "label") VALUES
  ('MALE', 'Male'),
  ('FEMALE', 'Female');

-- Enrollment statuses
CREATE TABLE "enrollment_statuses" (
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "enrollment_statuses_pkey" PRIMARY KEY ("code")
);

INSERT INTO "enrollment_statuses" ("code", "label") VALUES
  ('ACTIVE', 'Active'),
  ('WITHDRAWN', 'Withdrawn'),
  ('GRADUATED', 'Graduated'),
  ('PROMOTED', 'Promoted');

-- Attendance statuses
CREATE TABLE "attendance_statuses" (
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "attendance_statuses_pkey" PRIMARY KEY ("code")
);

INSERT INTO "attendance_statuses" ("code", "label") VALUES
  ('PRESENT', 'Present'),
  ('ABSENT', 'Absent'),
  ('TARDY', 'Tardy');

-- Behavior values
CREATE TABLE "behavior_values" (
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    CONSTRAINT "behavior_values_pkey" PRIMARY KEY ("code")
);

INSERT INTO "behavior_values" ("code", "label", "sort_order") VALUES
  ('OUTSTANDING', 'Outstanding', 1),
  ('LEADERSHIP', 'Leadership', 2),
  ('EXCELLENT', 'Excellent', 3),
  ('PARTICIPATION', 'Participation', 4),
  ('GOOD', 'Good', 5),
  ('TALKING', 'Talking', 6),
  ('DISRUPTIVE', 'Disruptive', 7),
  ('DISRESPECTFUL', 'Disrespectful', 8),
  ('REPEATED_MISCONDUCT', 'Repeated Misconduct', 9);

-- Session types
CREATE TABLE "session_types" (
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    CONSTRAINT "session_types_pkey" PRIMARY KEY ("code")
);

INSERT INTO "session_types" ("code", "label", "sort_order") VALUES
  ('INSTRUCTIONAL', 'Instructional', 1),
  ('QUIZ', 'Quiz', 2),
  ('MIDTERM_PROJECT', 'Midterm Project', 3),
  ('FINAL_EXAM', 'Final Exam', 4),
  ('PARENT_MEETING', 'Parent Meeting', 5),
  ('HOLIDAY', 'Holiday', 6),
  ('GRADUATION', 'Graduation', 7),
  ('MAKEUP', 'Makeup', 8);

-- Assessment types
CREATE TABLE "assessment_types" (
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    CONSTRAINT "assessment_types_pkey" PRIMARY KEY ("code")
);

INSERT INTO "assessment_types" ("code", "label", "sort_order") VALUES
  ('QUIZ_1', 'Quiz 1', 1),
  ('QUIZ_2', 'Quiz 2', 2),
  ('QUIZ_3', 'Quiz 3', 3),
  ('QUIZ_4', 'Quiz 4', 4),
  ('QUIZ_5', 'Quiz 5', 5),
  ('MIDTERM_PROJECT', 'Midterm Project', 6),
  ('FINAL_EXAM', 'Final Exam', 7);

-- Students.gender
ALTER TABLE "students" ADD COLUMN "gender_code" TEXT;
UPDATE "students" SET "gender_code" = "gender"::TEXT;
ALTER TABLE "students" ALTER COLUMN "gender_code" SET NOT NULL;
ALTER TABLE "students" DROP COLUMN "gender";
ALTER TABLE "students" RENAME COLUMN "gender_code" TO "gender";
ALTER TABLE "students" ADD CONSTRAINT "students_gender_fkey"
  FOREIGN KEY ("gender") REFERENCES "genders"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Student enrollments.status
ALTER TABLE "student_enrollments" ADD COLUMN "status_code" TEXT;
UPDATE "student_enrollments" SET "status_code" = "status"::TEXT;
ALTER TABLE "student_enrollments" ALTER COLUMN "status_code" SET NOT NULL;
ALTER TABLE "student_enrollments" ALTER COLUMN "status_code" SET DEFAULT 'ACTIVE';
ALTER TABLE "student_enrollments" DROP COLUMN "status";
ALTER TABLE "student_enrollments" RENAME COLUMN "status_code" TO "status";
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_status_fkey"
  FOREIGN KEY ("status") REFERENCES "enrollment_statuses"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Academic calendar session_type
ALTER TABLE "academic_calendar_days" ADD COLUMN "session_type_code" TEXT;
UPDATE "academic_calendar_days" SET "session_type_code" = "session_type"::TEXT;
ALTER TABLE "academic_calendar_days" ALTER COLUMN "session_type_code" SET NOT NULL;
ALTER TABLE "academic_calendar_days" ALTER COLUMN "session_type_code" SET DEFAULT 'INSTRUCTIONAL';
ALTER TABLE "academic_calendar_days" DROP COLUMN "session_type";
ALTER TABLE "academic_calendar_days" RENAME COLUMN "session_type_code" TO "session_type";
ALTER TABLE "academic_calendar_days" ADD CONSTRAINT "academic_calendar_days_session_type_fkey"
  FOREIGN KEY ("session_type") REFERENCES "session_types"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Attendance.status and behavior_value
ALTER TABLE "attendance" ADD COLUMN "status_code" TEXT;
UPDATE "attendance" SET "status_code" = "status"::TEXT;
ALTER TABLE "attendance" ALTER COLUMN "status_code" SET NOT NULL;
ALTER TABLE "attendance" DROP COLUMN "status";
ALTER TABLE "attendance" RENAME COLUMN "status_code" TO "status";
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_status_fkey"
  FOREIGN KEY ("status") REFERENCES "attendance_statuses"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attendance" ADD COLUMN "behavior_value_code" TEXT;
UPDATE "attendance" SET "behavior_value_code" = "behavior_value"::TEXT WHERE "behavior_value" IS NOT NULL;
ALTER TABLE "attendance" DROP COLUMN "behavior_value";
ALTER TABLE "attendance" RENAME COLUMN "behavior_value_code" TO "behavior_value";
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_behavior_value_fkey"
  FOREIGN KEY ("behavior_value") REFERENCES "behavior_values"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Behavior history
ALTER TABLE "behavior_history" ADD COLUMN "behavior_value_code" TEXT;
UPDATE "behavior_history" SET "behavior_value_code" = "behavior_value"::TEXT;
ALTER TABLE "behavior_history" ALTER COLUMN "behavior_value_code" SET NOT NULL;
ALTER TABLE "behavior_history" DROP COLUMN "behavior_value";
ALTER TABLE "behavior_history" RENAME COLUMN "behavior_value_code" TO "behavior_value";
ALTER TABLE "behavior_history" ADD CONSTRAINT "behavior_history_behavior_value_fkey"
  FOREIGN KEY ("behavior_value") REFERENCES "behavior_values"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Assessment scores.type
ALTER TABLE "assessment_scores" ADD COLUMN "type_code" TEXT;
UPDATE "assessment_scores" SET "type_code" = "type"::TEXT;
ALTER TABLE "assessment_scores" ALTER COLUMN "type_code" SET NOT NULL;
ALTER TABLE "assessment_scores" DROP COLUMN "type";
ALTER TABLE "assessment_scores" RENAME COLUMN "type_code" TO "type";
ALTER TABLE "assessment_scores" ADD CONSTRAINT "assessment_scores_type_fkey"
  FOREIGN KEY ("type") REFERENCES "assessment_types"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop unused enum types
DROP TYPE "StudentGender";
DROP TYPE "EnrollmentStatus";
DROP TYPE "AttendanceStatus";
DROP TYPE "BehaviorValue";
DROP TYPE "SessionType";
DROP TYPE "AssessmentType";
