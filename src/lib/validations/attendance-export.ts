import { z } from "zod";

export const attendanceMatrixExportSchema = z.object({
  schoolId: z.string().uuid(),
  classroom: z.string().optional(),
});

export type AttendanceMatrixExportInput = z.infer<
  typeof attendanceMatrixExportSchema
>;
