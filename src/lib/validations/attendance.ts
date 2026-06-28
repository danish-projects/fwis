import { z } from "zod";
import {
  ATTENDANCE_STATUS_CODES,
  BEHAVIOR_RATING_CODES,
} from "@/lib/setup-types";

const optionalComment = z.string().max(2000).optional();

export const attendanceRecordSchema = z.object({
  enrollmentId: z.string().uuid(),
  status: z.enum(ATTENDANCE_STATUS_CODES),
  behaviorValue: z.enum(BEHAVIOR_RATING_CODES).optional(),
  behaviorComments: optionalComment,
  teacherComments: optionalComment,
});

export type AttendanceRecordInput = z.infer<typeof attendanceRecordSchema>;

export const bulkAttendanceSchema = z.object({
  calendarDayId: z.string().uuid(),
  records: z.array(attendanceRecordSchema).max(500),
});

export const matrixAttendanceRecordSchema = z.object({
  enrollmentId: z.string().uuid(),
  calendarDayId: z.string().uuid(),
  status: z.enum(ATTENDANCE_STATUS_CODES),
  behaviorValue: z.enum(BEHAVIOR_RATING_CODES).optional(),
});

export type MatrixAttendanceRecordInput = z.infer<
  typeof matrixAttendanceRecordSchema
>;

export const bulkAttendanceMatrixSchema = z
  .array(matrixAttendanceRecordSchema)
  .max(5000);
