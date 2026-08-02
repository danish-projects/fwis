import { z } from "zod";
import {
  ATTENDANCE_STATUS_CODES,
  BEHAVIOR_RATING_CODES,
  type BehaviorRatingCode,
} from "@/lib/setup-types";

const optionalComment = z.string().max(2000).optional();

/** Empty select / missing → undefined; never coerce to null here. */
const optionalBehaviorValue = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  return value;
}, z.enum(BEHAVIOR_RATING_CODES).optional());

export const attendanceRecordSchema = z.object({
  enrollmentId: z.string().uuid(),
  status: z.enum(ATTENDANCE_STATUS_CODES),
  behaviorValue: optionalBehaviorValue,
  behaviorComments: optionalComment,
  teacherComments: optionalComment,
});

export type AttendanceRecordInput = z.infer<typeof attendanceRecordSchema> & {
  behaviorValue?: BehaviorRatingCode;
};

export const bulkAttendanceSchema = z.object({
  calendarDayId: z.string().uuid(),
  records: z.array(attendanceRecordSchema).max(500),
});

export const matrixAttendanceRecordSchema = z.object({
  enrollmentId: z.string().uuid(),
  calendarDayId: z.string().uuid(),
  status: z.enum(ATTENDANCE_STATUS_CODES),
  behaviorValue: optionalBehaviorValue,
});

export type MatrixAttendanceRecordInput = z.infer<
  typeof matrixAttendanceRecordSchema
> & {
  behaviorValue?: BehaviorRatingCode;
};

export const bulkAttendanceMatrixSchema = z
  .array(matrixAttendanceRecordSchema)
  .max(5000);
