/** Staff position codes stored in roles table (subset of UserRoleCode). */
export const STAFF_POSITION_CODES = [
  "NIGRA",
  "PRINCIPAL",
  "SCHOOL_ADMIN",
  "TEACHER",
  "SUBSTITUTE",
] as const;

export type StaffPositionCode = (typeof STAFF_POSITION_CODES)[number];

export const STAFF_ROLE_LABELS: Record<StaffPositionCode, string> = {
  NIGRA: "Nigran",
  PRINCIPAL: "Principal",
  SCHOOL_ADMIN: "School Admin",
  TEACHER: "Teacher",
  SUBSTITUTE: "Substitute",
};

/** @deprecated Use StaffPositionCode */
export type StaffRoleCode = StaffPositionCode;

/** @deprecated Use STAFF_POSITION_CODES */
export const STAFF_ROLE_CODES = STAFF_POSITION_CODES;
