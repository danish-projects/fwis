-- FWIS Row Level Security Policies
-- Run in Supabase SQL Editor after Prisma migrations

-- Enable RLS on tenant-scoped tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Helper: get user's primary role from app tables
CREATE OR REPLACE FUNCTION public.fwis_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.code::text
  FROM app_users u
  JOIN user_roles ur ON ur.user_id = u.id
  JOIN roles r ON r.id = ur.role_id
  WHERE u.id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.fwis_user_school_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM user_schools WHERE user_id = auth.uid();
$$;

-- Schools
CREATE POLICY schools_super_admin_all ON schools
  FOR ALL USING (public.fwis_user_role() = 'SUPER_ADMIN');

CREATE POLICY schools_school_admin_select ON schools
  FOR SELECT USING (
    public.fwis_user_role() = 'SCHOOL_ADMIN'
    AND id IN (SELECT public.fwis_user_school_ids())
  );

-- Enrollments
CREATE POLICY enrollments_super_admin ON student_enrollments
  FOR ALL USING (public.fwis_user_role() = 'SUPER_ADMIN');

CREATE POLICY enrollments_school_admin ON student_enrollments
  FOR ALL USING (
    public.fwis_user_role() = 'SCHOOL_ADMIN'
    AND school_id IN (SELECT public.fwis_user_school_ids())
  );

CREATE POLICY enrollments_teacher_select ON student_enrollments
  FOR SELECT USING (
    public.fwis_user_role() = 'TEACHER'
    AND classroom_id IN (
      SELECT tc.classroom_id
      FROM teacher_classrooms tc
      JOIN teachers t ON t.id = tc.teacher_id
      WHERE t.user_id = auth.uid()
    )
  );

CREATE POLICY enrollments_read_only ON student_enrollments
  FOR SELECT USING (
    public.fwis_user_role() = 'READ_ONLY'
    AND school_id IN (SELECT public.fwis_user_school_ids())
  );

-- Attendance: teachers can insert/update for their classrooms
CREATE POLICY attendance_teacher_write ON attendance
  FOR INSERT WITH CHECK (
    public.fwis_user_role() = 'TEACHER'
    AND enrollment_id IN (
      SELECT se.id FROM student_enrollments se
      JOIN teacher_classrooms tc ON tc.classroom_id = se.classroom_id
      JOIN teachers t ON t.id = tc.teacher_id
      WHERE t.user_id = auth.uid()
    )
  );

CREATE POLICY attendance_read ON attendance
  FOR SELECT USING (
    public.fwis_user_role() IN ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'READ_ONLY')
  );
