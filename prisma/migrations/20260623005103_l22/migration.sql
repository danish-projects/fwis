/*
  Warnings:

  - A unique constraint covering the columns `[enrollment_id,type]` on the table `assessment_scores` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_behavior_value_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "assessment_scores_enrollment_id_type_key" ON "assessment_scores"("enrollment_id", "type");

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_behavior_value_fkey" FOREIGN KEY ("behavior_value") REFERENCES "behavior_values"("code") ON DELETE SET NULL ON UPDATE CASCADE;
