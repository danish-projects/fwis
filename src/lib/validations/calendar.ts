import { SESSION_TYPE_CODES } from "@/lib/setup-types";
import { isAttendanceNeeded } from "@/lib/grades/attendance-percentage";
import { z } from "zod";

export const sessionTypeSchema = z.enum(SESSION_TYPE_CODES);

const calendarDayFieldsSchema = z.object({
  academicYearSchoolId: z.string().uuid(),
  date: z.string().min(1, "Date is required"),
  lessonPlanNumber: z.coerce.number().int().min(1).optional().nullable(),
  sessionType: sessionTypeSchema.default("INSTRUCTIONAL"),
});

function refineLessonPlanNumber<
  T extends { sessionType: z.infer<typeof sessionTypeSchema>; lessonPlanNumber?: number | null },
>(data: T, ctx: z.RefinementCtx) {
  if (isAttendanceNeeded(data.sessionType) && data.lessonPlanNumber == null) {
    ctx.addIssue({
      code: "custom",
      message: "Lesson plan number is required when attendance is needed",
      path: ["lessonPlanNumber"],
    });
  }
}

export const calendarDaySchema = calendarDayFieldsSchema.superRefine(refineLessonPlanNumber);

export type CalendarDayInput = z.infer<typeof calendarDaySchema>;

export const calendarDayUpdateSchema = calendarDayFieldsSchema
  .omit({ academicYearSchoolId: true, date: true })
  .superRefine(refineLessonPlanNumber);

export type CalendarDayUpdateInput = z.infer<typeof calendarDayUpdateSchema>;

export const calendarBulkGenerateDaySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
    sessionType: sessionTypeSchema,
    lessonPlanNumber: z
      .union([z.number().int().min(1), z.null()])
      .optional(),
  })
  .superRefine(refineLessonPlanNumber);

export const calendarBulkGenerateSchema = z.object({
  academicYearId: z.string().uuid(),
  schoolIds: z.array(z.string().uuid()).min(1, "Select at least one school"),
  days: z
    .array(calendarBulkGenerateDaySchema)
    .min(1, "At least one calendar day is required"),
});

export type CalendarBulkGenerateInput = z.infer<typeof calendarBulkGenerateSchema>;

export const academicYearHolidaySchema = z.object({
  academicYearId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  name: z.string().trim().max(120).optional().or(z.literal("")),
});

export type AcademicYearHolidayInput = z.infer<typeof academicYearHolidaySchema>;

export const calendarCloneSchema = z.object({
  academicYearId: z.string().uuid(),
  targetSchoolIds: z
    .array(z.string().uuid())
    .min(1, "Select at least one school"),
});

export type CalendarCloneInput = z.infer<typeof calendarCloneSchema>;
