import { z } from "zod";
import { listPaginationSchema } from "@/lib/validations/pagination";

export const gradeRecordSchema = z.object({
  schoolId: z.string().uuid("School is required"),
  gradeId: z.coerce.number().int().min(1, "Grade level is required"),
  sectionId: z.coerce.number().int().min(1, "Section is required"),
  name: z.string().min(2).optional(),
  isActive: z.boolean().default(true),
});

export type GradeRecordInput = z.infer<typeof gradeRecordSchema>;

export const gradeRecordPairSchema = z.object({
  gradeId: z.coerce.number().int().min(1),
  sectionId: z.coerce.number().int().min(1),
});

export const bulkGradeRecordSchema = z.object({
  schoolId: z.string().uuid("School is required"),
  pairs: z
    .array(gradeRecordPairSchema)
    .min(1, "Select at least one grade and section"),
  isActive: z.boolean().default(true),
});

export type BulkGradeRecordInput = z.infer<typeof bulkGradeRecordSchema>;

export const gradeRecordListSchema = listPaginationSchema.extend({
  schoolId: z.string().uuid().optional(),
});

export type GradeRecordListInput = z.infer<typeof gradeRecordListSchema>;
