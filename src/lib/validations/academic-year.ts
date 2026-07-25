import { z } from "zod";
import { listPaginationSchema } from "@/lib/validations/pagination";

const academicYearBaseSchema = z
  .object({
    name: z.string().min(4, "Name is required (e.g. 2025-2026)"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    schoolIds: z.array(z.string().uuid()),
    isActive: z.boolean().default(false),
    generateCalendar: z.boolean().default(false),
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export const academicYearCreateSchema = academicYearBaseSchema.refine(
  (data) => data.schoolIds.length > 0,
  { message: "Select at least one school", path: ["schoolIds"] }
);

export const academicYearUpdateSchema = academicYearBaseSchema;

export type AcademicYearInput = z.infer<typeof academicYearUpdateSchema>;
export type AcademicYearCreateInput = z.infer<typeof academicYearCreateSchema>;

/** @deprecated Use academicYearCreateSchema or academicYearUpdateSchema */
export const academicYearSchema = academicYearCreateSchema;

export const academicYearListSchema = listPaginationSchema.extend({
  schoolId: z.string().uuid().optional(),
});

export type AcademicYearListInput = z.infer<typeof academicYearListSchema>;
