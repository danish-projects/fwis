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
