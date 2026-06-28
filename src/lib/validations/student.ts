import { z } from "zod";
import { GENDER_CODES } from "@/lib/setup-types";

export const studentSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  gender: z.enum(GENDER_CODES),
  dateOfBirth: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  parentEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  enrollmentDate: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type StudentInput = z.infer<typeof studentSchema>;

export const studentListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  gender: z.enum(GENDER_CODES).optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  sort: z.enum(["lastName", "firstName", "enrollmentDate"]).default("lastName"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

export type StudentListInput = z.infer<typeof studentListSchema>;

export const studentExportSchema = studentListSchema.pick({
  search: true,
  gender: true,
  isActive: true,
});
