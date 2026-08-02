-- Consolidate roster × calendar day with attendance/behavior and enrollment assessments.
-- Grain: one row per active enrollment per school-year calendar day.
-- Assessments are enrollment-scoped (not per day); scores repeat on each day row when present.

CREATE OR REPLACE VIEW v_consolidate_attendance_day AS
SELECT
  sch.id AS school_id,
  sch.name AS school_name,
  sch.code AS school_code,
  ay.id AS academic_year_id,
  ay.name AS academic_year_name,
  ays.id AS academic_year_school_id,
  st.id AS staff_id,
  NULLIF(TRIM(CONCAT(COALESCE(st.first_name, ''), ' ', COALESCE(st.last_name, ''))), '') AS staff_name,
  g.id AS grade_id,
  g.name AS grade_name,
  sec.id AS section_id,
  sec.name AS section_name,
  c.id AS classroom_id,
  c.name AS classroom_name,
  acd.id AS calendar_day_id,
  acd.date AS calendar_date,
  acd.lesson_plan_number,
  acd.session_type,
  s.id AS student_id,
  s.student_number,
  s.first_name AS student_first_name,
  s.last_name AS student_last_name,
  TRIM(CONCAT(s.first_name, ' ', s.last_name)) AS student_name,
  s.gender AS student_gender,
  se.id AS enrollment_id,
  se.status AS enrollment_status,
  att.id AS attendance_id,
  att.status AS attendance_code,
  att.behavior_value AS behavior_code,
  att.behavior_comments,
  att.teacher_comments,
  as_q1.score AS assessment_quiz_1,
  as_q2.score AS assessment_quiz_2,
  as_q3.score AS assessment_quiz_3,
  as_q4.score AS assessment_quiz_4,
  as_q5.score AS assessment_quiz_5,
  as_mid.score AS assessment_midterm_project,
  as_fin.score AS assessment_final_exam
FROM student_enrollments se
INNER JOIN schools sch
  ON sch.id = se.school_id
  AND sch.deleted_at IS NULL
INNER JOIN academic_year_schools ays
  ON ays.id = se.academic_year_school_id
  AND ays.deleted_at IS NULL
INNER JOIN academic_years ay
  ON ay.id = ays.academic_year_id
  AND ay.deleted_at IS NULL
INNER JOIN classrooms c
  ON c.id = se.classroom_id
  AND c.deleted_at IS NULL
INNER JOIN grades g
  ON g.id = c.grade_id
INNER JOIN sections sec
  ON sec.id = c.section_id
INNER JOIN students s
  ON s.id = se.student_id
  AND s.deleted_at IS NULL
INNER JOIN academic_calendar_days acd
  ON acd.academic_year_school_id = se.academic_year_school_id
  AND acd.deleted_at IS NULL
LEFT JOIN staff st
  ON st.id = se.staff_id
  AND st.deleted_at IS NULL
LEFT JOIN attendance att
  ON att.enrollment_id = se.id
  AND att.calendar_day_id = acd.id
  AND att.deleted_at IS NULL
LEFT JOIN assessment_scores as_q1
  ON as_q1.enrollment_id = se.id
  AND as_q1.type = 'QUIZ_1'
  AND as_q1.deleted_at IS NULL
LEFT JOIN assessment_scores as_q2
  ON as_q2.enrollment_id = se.id
  AND as_q2.type = 'QUIZ_2'
  AND as_q2.deleted_at IS NULL
LEFT JOIN assessment_scores as_q3
  ON as_q3.enrollment_id = se.id
  AND as_q3.type = 'QUIZ_3'
  AND as_q3.deleted_at IS NULL
LEFT JOIN assessment_scores as_q4
  ON as_q4.enrollment_id = se.id
  AND as_q4.type = 'QUIZ_4'
  AND as_q4.deleted_at IS NULL
LEFT JOIN assessment_scores as_q5
  ON as_q5.enrollment_id = se.id
  AND as_q5.type = 'QUIZ_5'
  AND as_q5.deleted_at IS NULL
LEFT JOIN assessment_scores as_mid
  ON as_mid.enrollment_id = se.id
  AND as_mid.type = 'MIDTERM_PROJECT'
  AND as_mid.deleted_at IS NULL
LEFT JOIN assessment_scores as_fin
  ON as_fin.enrollment_id = se.id
  AND as_fin.type = 'FINAL_EXAM'
  AND as_fin.deleted_at IS NULL
WHERE se.deleted_at IS NULL
  AND se.status = 'ACTIVE';

COMMENT ON VIEW v_consolidate_attendance_day IS
  'Active enrollments × school-year calendar days with attendance/behavior and enrollment assessment scores (quizzes, midterm, final).';
