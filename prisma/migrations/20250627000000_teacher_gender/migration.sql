-- Add gender to teachers (Male → Boys grades, Female → Girls grades)
ALTER TABLE "teachers" ADD COLUMN "gender" TEXT;

UPDATE "teachers" t
SET "gender" = CASE
  WHEN s.name = 'Girls' THEN 'FEMALE'
  ELSE 'MALE'
END
FROM "teacher_classrooms" tc
JOIN "classrooms" c ON c.id = tc.classroom_id
JOIN "sections" s ON s.id = c.section_id
WHERE tc.teacher_id = t.id;

UPDATE "teachers" SET "gender" = 'MALE' WHERE "gender" IS NULL;

ALTER TABLE "teachers" ALTER COLUMN "gender" SET NOT NULL;

ALTER TABLE "teachers" ADD CONSTRAINT "teachers_gender_fkey" FOREIGN KEY ("gender") REFERENCES "genders"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
