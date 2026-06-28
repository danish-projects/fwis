-- Composite indexes for classroom/year enrollment lookups
CREATE INDEX "student_enrollments_classroom_id_academic_year_id_status_idx" ON "student_enrollments"("classroom_id", "academic_year_id", "status");

-- Attendance lookups by enrollment and calendar day
CREATE INDEX "attendance_enrollment_id_deleted_at_idx" ON "attendance"("enrollment_id", "deleted_at");
CREATE INDEX "attendance_calendar_day_id_idx" ON "attendance"("calendar_day_id");

-- Assessment scores by enrollment
CREATE INDEX "assessment_scores_enrollment_id_deleted_at_idx" ON "assessment_scores"("enrollment_id", "deleted_at");

-- Calendar days by academic year
CREATE INDEX "academic_calendar_days_academic_year_id_deleted_at_idx" ON "academic_calendar_days"("academic_year_id", "deleted_at");

-- Academic years by school
CREATE INDEX "academic_years_school_id_deleted_at_idx" ON "academic_years"("school_id", "deleted_at");

-- Behavior history by enrollment
CREATE INDEX "behavior_history_enrollment_id_idx" ON "behavior_history"("enrollment_id");
