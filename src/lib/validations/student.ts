import { z } from "zod";
import { GENDER_CODES } from "@/lib/setup-types";
import { emptyToUndefined, optionalBooleanQuery } from "@/lib/validations/pagination";

const optionalEmail = z.union([
  z.string().email("Enter a valid email (for example name@example.com)"),
  z.literal(""),
]).optional();

const optionalTrimmed = z.string().optional();

export const studentSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  gender: z.enum(GENDER_CODES),
  dateOfBirth: z.string().optional(),
  emailAddress: optionalEmail,
  streetAddress: optionalTrimmed,
  city: optionalTrimmed,
  stateProvince: optionalTrimmed,
  zipPostalCode: optionalTrimmed,
  country: optionalTrimmed,
  fatherGuardianFirstName: optionalTrimmed,
  fatherGuardianLastName: optionalTrimmed,
  fatherParentalResponsibility: z.boolean().optional(),
  fatherMobileWhatsappNumber: optionalTrimmed,
  motherGuardianFirstName: optionalTrimmed,
  motherGuardianLastName: optionalTrimmed,
  motherParentalResponsibility: z.boolean().optional(),
  motherMobileWhatsappNumber: optionalTrimmed,
  emergencyContact: optionalTrimmed,
  enrollmentDate: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type StudentInput = z.infer<typeof studentSchema>;

export const studentListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: emptyToUndefined(z.string().optional()),
  gender: emptyToUndefined(z.enum(GENDER_CODES).optional()),
  isActive: optionalBooleanQuery,
  sort: z.enum(["lastName", "firstName", "enrollmentDate"]).default("lastName"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

export type StudentListInput = z.infer<typeof studentListSchema>;

export const studentExportSchema = studentListSchema.pick({
  search: true,
  gender: true,
  isActive: true,
});
