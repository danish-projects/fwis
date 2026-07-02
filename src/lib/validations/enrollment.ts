import { z } from "zod";
import { listPaginationSchema, emptyToUndefined } from "@/lib/validations/pagination";

export const enrollmentSchema = z.object({
  studentId: z.string().uuid("Select a student"),
  schoolId: z.string().uuid("Select a school"),
  academicYearId: z.string().uuid("Select an academic year"),
  classroomId: z.string().uuid("Select a classroom"),
  teacherId: z.string().uuid().optional().or(z.literal("")),
  enrollmentDate: z.string().optional(),
  status: z.enum(["ACTIVE", "WITHDRAWN", "GRADUATED", "PROMOTED"]).default("ACTIVE"),
});

export type EnrollmentInput = z.infer<typeof enrollmentSchema>;

export const ASSESSMENT_TYPE_LABELS = {
  QUIZ_1: "Quiz 1",
  QUIZ_2: "Quiz 2",
  QUIZ_3: "Quiz 3",
  QUIZ_4: "Quiz 4",
  QUIZ_5: "Quiz 5",
  MIDTERM_PROJECT: "Midterm Project",
  FINAL_EXAM: "Final Exam",
} as const;

export const ASSESSMENT_TYPES = [
  "QUIZ_1",
  "QUIZ_2",
  "QUIZ_3",
  "QUIZ_4",
  "QUIZ_5",
  "MIDTERM_PROJECT",
  "FINAL_EXAM",
] as const;

export const QUIZ_TYPES = [
  "QUIZ_1",
  "QUIZ_2",
  "QUIZ_3",
  "QUIZ_4",
  "QUIZ_5",
] as const;

export const assessmentScoreSchema = z.object({
  enrollmentId: z.string().uuid(),
  type: z.enum([
    "QUIZ_1",
    "QUIZ_2",
    "QUIZ_3",
    "QUIZ_4",
    "QUIZ_5",
    "MIDTERM_PROJECT",
    "FINAL_EXAM",
  ]),
  score: z.coerce.number().min(0).max(100),
});

export type AssessmentScoreInput = z.infer<typeof assessmentScoreSchema>;

export const enrollmentListSchema = listPaginationSchema.extend({
  schoolId: emptyToUndefined(z.string().uuid().optional()),
  academicYearId: emptyToUndefined(z.string().uuid().optional()),
  classroomId: emptyToUndefined(z.string().uuid().optional()),
  status: emptyToUndefined(
    z.enum(["ACTIVE", "WITHDRAWN", "GRADUATED", "PROMOTED"]).optional()
  ),
});

export type EnrollmentListInput = z.infer<typeof enrollmentListSchema>;
