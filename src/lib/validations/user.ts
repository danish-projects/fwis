import { z } from "zod";
import { UserRoleCode } from "@prisma/client";
import { listPaginationSchema, optionalBooleanQuery } from "@/lib/validations/pagination";

const roleCodes = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "TEACHER",
  "READ_ONLY",
] as const satisfies readonly UserRoleCode[];

const userCoreFieldsSchema = z.object({
  email: z.string().email("Invalid email"),
  fullName: z.string().min(1, "Full name is required"),
  roleCodes: z
    .array(z.enum(roleCodes))
    .min(1, "At least one role is required"),
  schoolIds: z.array(z.string().uuid()).default([]),
  gender: z.enum(["MALE", "FEMALE"]).optional().nullable(),
  isActive: z.boolean().default(true),
});

function refineUserFields<
  T extends {
    roleCodes: (typeof roleCodes)[number][];
    schoolIds: string[];
    gender?: "MALE" | "FEMALE" | null;
  },
>(data: T, ctx: z.RefinementCtx) {
  const needsSchool =
    data.roleCodes.includes("SCHOOL_ADMIN") ||
    data.roleCodes.includes("TEACHER") ||
    data.roleCodes.includes("READ_ONLY");

  if (needsSchool && data.schoolIds.length === 0) {
    ctx.addIssue({
      code: "custom",
      message: "School access is required for this role",
      path: ["schoolIds"],
    });
  }

  if (data.roleCodes.includes("SUPER_ADMIN") && data.roleCodes.length > 1) {
    ctx.addIssue({
      code: "custom",
      message: "Super Admin cannot be combined with other roles",
      path: ["roleCodes"],
    });
  }

  if (
    data.gender &&
    !(data.roleCodes.includes("SCHOOL_ADMIN") && data.roleCodes.length === 1)
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Section scope (gender) applies only to School Admin role",
      path: ["gender"],
    });
  }
}

export const userSchema = userCoreFieldsSchema
  .extend({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .optional(),
  })
  .superRefine(refineUserFields);

export type UserInput = z.infer<typeof userSchema>;

export const createUserSchema = userCoreFieldsSchema
  .extend({
    password: z.string().min(8, "Password must be at least 8 characters"),
  })
  .superRefine(refineUserFields);

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const userListSchema = listPaginationSchema.extend({
  role: z.enum(roleCodes).optional(),
  schoolId: z.string().uuid().optional(),
  isActive: optionalBooleanQuery,
});

export type UserListInput = z.infer<typeof userListSchema>;
