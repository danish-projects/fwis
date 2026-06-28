import { z } from "zod";
import { listPaginationSchema } from "@/lib/validations/pagination";

export const academicYearSchema = z
  .object({
    schoolId: z.string().uuid("School is required"),
    name: z.string().min(4, "Name is required (e.g. 2025-2026)"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    isActive: z.boolean().default(false),
    generateCalendar: z.boolean().default(true),
  })
  .refine(
    (data) => new Date(data.startDate) <= new Date(data.endDate),
    { message: "End date must be on or after start date", path: ["endDate"] }
  );

export type AcademicYearInput = z.infer<typeof academicYearSchema>;

export const academicYearListSchema = listPaginationSchema.extend({
  schoolId: z.string().uuid().optional(),
});

export type AcademicYearListInput = z.infer<typeof academicYearListSchema>;
