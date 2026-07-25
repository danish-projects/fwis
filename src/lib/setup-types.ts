import type {
  GenderCode,
  EnrollmentStatusCode,
  AttendanceStatusCode,
  BehaviorRatingCode,
  BehaviorValueCode,
  SessionTypeCode,
  AssessmentTypeCode,
} from "../../prisma/lookup-data";

export {
  GENDER_CODES,
  ENROLLMENT_STATUS_CODES,
  ATTENDANCE_STATUS_CODES,
  BEHAVIOR_RATING_CODES,
  BEHAVIOR_VALUE_CODES,
  SESSION_TYPE_CODES,
  QUIZ_SESSION_TYPE_CODES,
  ASSESSMENT_TYPE_CODES,
  type GenderCode,
  type EnrollmentStatusCode,
  type AttendanceStatusCode,
  type BehaviorRatingCode,
  type BehaviorValueCode,
  type SessionTypeCode,
  type QuizSessionTypeCode,
  type AssessmentTypeCode,
} from "../../prisma/lookup-data";

export {
  STAFF_POSITION_CODES,
  STAFF_ROLE_CODES,
  STAFF_ROLE_LABELS,
  type StaffPositionCode,
  type StaffRoleCode,
} from "@/lib/roles/staff-positions";

/** @deprecated Use SessionTypeCode */
export type SessionType = SessionTypeCode;
/** @deprecated Use AttendanceStatusCode */
export type AttendanceStatus = AttendanceStatusCode;
/** @deprecated Use BehaviorRatingCode */
export type BehaviorValue = BehaviorRatingCode;
/** @deprecated Use BehaviorRatingCode */
export type BehaviorRating = BehaviorRatingCode;
/** @deprecated Use AssessmentTypeCode */
export type AssessmentType = AssessmentTypeCode;
/** @deprecated Use EnrollmentStatusCode */
export type EnrollmentStatus = EnrollmentStatusCode;
/** @deprecated Use GenderCode */
export type StudentGender = GenderCode;

/** Cast Prisma FK code columns to typed setup values (validated by DB constraints). */
export const asSessionType = (value: string): SessionTypeCode => value as SessionTypeCode;
export const asAttendanceStatus = (value: string): AttendanceStatusCode =>
  value as AttendanceStatusCode;
export const asBehaviorRating = (value: string): BehaviorRatingCode =>
  value as BehaviorRatingCode;
/** @deprecated Use asBehaviorRating */
export const asBehaviorValue = asBehaviorRating;
export const asAssessmentType = (value: string): AssessmentTypeCode =>
  value as AssessmentTypeCode;
export const asEnrollmentStatus = (value: string): EnrollmentStatusCode =>
  value as EnrollmentStatusCode;
export const asGender = (value: string): GenderCode => value as GenderCode;
