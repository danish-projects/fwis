import { z } from "zod";
import { listPaginationSchema } from "@/lib/validations/pagination";

export const schoolSchema = z.object({
  name: z.string().min(2, "School name is required"),
  address: z.string().optional(),
  city: z.string().min(2, "City is required"),
  cityCode: z
    .string()
    .regex(/^[A-Z]{3}$/, "City code must be 3 uppercase letters")
    .optional(),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  principalName: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type SchoolInput = z.infer<typeof schoolSchema>;

export const schoolListSchema = listPaginationSchema;

export type SchoolListInput = z.infer<typeof schoolListSchema>;

/** @deprecated Use listPaginationSchema from @/lib/validations/pagination */
export const paginationSchema = listPaginationSchema.extend({
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("asc"),
});

/** @deprecated Use ListPaginationInput from @/lib/validations/pagination */
export type PaginationInput = z.infer<typeof paginationSchema>;
