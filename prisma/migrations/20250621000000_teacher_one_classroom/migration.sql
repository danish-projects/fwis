-- Each teacher may be assigned to at most one grade/classroom at a time.
DELETE FROM "teacher_classrooms" tc
WHERE EXISTS (
  SELECT 1
  FROM "teacher_classrooms" tc2
  WHERE tc2."teacher_id" = tc."teacher_id"
    AND tc2."classroom_id" < tc."classroom_id"
);

CREATE UNIQUE INDEX "teacher_classrooms_teacher_id_key" ON "teacher_classrooms"("teacher_id");
