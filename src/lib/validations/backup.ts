import { z } from "zod";

export const schoolBackupExportSchema = z.object({
  schoolId: z.string().uuid(),
  yearId: z.string().uuid(),
});

export type SchoolBackupExportInput = z.infer<typeof schoolBackupExportSchema>;
