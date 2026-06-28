-- Recreate composite index after setup_lookup_tables recreated the status column.
-- performance_indexes created this index on the old enum column; it was dropped when
-- status was migrated to a lookup FK. The index may already exist from db push.
CREATE INDEX IF NOT EXISTS "student_enrollments_classroom_id_academic_year_id_status_idx"
  ON "student_enrollments"("classroom_id", "academic_year_id", "status");
