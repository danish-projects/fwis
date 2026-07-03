import { z } from "zod";
import { GENDER_CODES } from "@/lib/setup-types";
import {
  emptyToUndefined,
  listPaginationSchema,
  optionalBooleanQuery,
} from "@/lib/validations/pagination";

export const teacherSchema = z.object({
  schoolId: z.string().uuid("School is required"),
  gender: z.enum(GENDER_CODES, { message: "Gender is required" }),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
  classroomIds: z
    .array(z.string().uuid())
    .max(1, "A teacher may only be assigned to one grade per academic year")
    .default([]),
});

export type TeacherInput = z.infer<typeof teacherSchema>;

export const teacherListSchema = listPaginationSchema.extend({
  schoolId: emptyToUndefined(z.string().uuid().optional()),
  gender: emptyToUndefined(z.enum(GENDER_CODES).optional()),
  isActive: optionalBooleanQuery,
});

export type TeacherListInput = z.infer<typeof teacherListSchema>;
