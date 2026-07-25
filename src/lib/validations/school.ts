import { z } from "zod";
import { listPaginationSchema } from "@/lib/validations/pagination";

export const schoolSchema = z.object({
  name: z.string().min(2, "School name is required"),
  address: z.string().min(2, "Address is required"),
  city: z.string().min(2, "City is required"),
  cityCode: z.preprocess(
    (value) => {
      if (value == null || value === "") return undefined;
      if (typeof value === "string") return value.trim().toUpperCase();
      return value;
    },
    z
      .string()
      .regex(/^[A-Z]{3}$/, "School code must be exactly 3 letters")
      .optional()
  ),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().min(2, "Postal code is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  /** Create principal, section admins, grade teachers (G1–G6), and substitutes in app_users. */
  createDefaultUsers: z.boolean().default(false),
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
