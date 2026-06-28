import { z } from "zod";

export const listPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export type ListPaginationInput = z.infer<typeof listPaginationSchema>;

/** Accepts boolean (server actions) or "true"/"false" strings (URL params). */
export const optionalBooleanQuery = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (typeof v === "boolean") return v;
    return v === "true";
  });
