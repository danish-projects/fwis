import { z } from "zod";

export const assessmentMatrixExportSchema = z.object({
  classroomId: z.string().uuid(),
  year: z.string().uuid().optional(),
});

export type AssessmentMatrixExportInput = z.infer<
  typeof assessmentMatrixExportSchema
>;
