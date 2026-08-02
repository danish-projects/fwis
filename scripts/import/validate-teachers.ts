import type { PrismaClient } from "@prisma/client";
import { isGlobalStaffRole } from "../../src/lib/roles/ensure-role";
import { deriveStaffLoginUserId } from "../../src/lib/school/default-login-specs";
import {
  classroomLabel,
  normalizeGender,
  normalizeGrade,
  normalizeSection,
  normalizeStaffRole,
} from "./normalize";
import type { RowRecord } from "./read-workbook";

export type ImportStaffRoleCode =
  | "PRINCIPAL"
  | "SCHOOL_ADMIN"
  | "TEACHER"
  | "SUBSTITUTE";

const IMPORT_ALLOWED_ROLES = new Set<ImportStaffRoleCode>([
  "PRINCIPAL",
  "SCHOOL_ADMIN",
  "TEACHER",
  "SUBSTITUTE",
]);

/** Roles that are not assigned to a single classroom. */
const NON_CLASSROOM_ROLES = new Set<ImportStaffRoleCode>([
  "PRINCIPAL",
  "SCHOOL_ADMIN",
  "SUBSTITUTE",
]);

function normalizeImportStaffRole(
  value: string | undefined,
  rowNum: number
): ImportStaffRoleCode {
  const role = normalizeStaffRole(value);
  if (!IMPORT_ALLOWED_ROLES.has(role as ImportStaffRoleCode)) {
    throw new Error(
      `Staff row ${rowNum}: staff_role "${value}" is not allowed. ` +
        `Use Principal, School Admin, Teacher, or Substitute.`
    );
  }
  return role as ImportStaffRoleCode;
}

function resolveStaffGender(
  row: RowRecord,
  rowNum: number,
  roleCode: ImportStaffRoleCode
): "MALE" | "FEMALE" {
  const rawGender = row.gender?.trim();
  if (rawGender) {
    return normalizeGender(rawGender);
  }

  if (roleCode === "TEACHER") {
    // Teachers: derive from section when gender column is blank.
    const sectionName = normalizeSection(row.section);
    return sectionName === "Boys" ? "MALE" : "FEMALE";
  }

  if (roleCode === "PRINCIPAL") {
    throw new Error(
      `Staff row ${rowNum}: gender is required for Principal (MALE or FEMALE).`
    );
  }

  if (roleCode === "SCHOOL_ADMIN") {
    throw new Error(
      `Staff row ${rowNum}: gender is required for School Admin (MALE or FEMALE). ` +
        `Boys admin → MALE (…m.admin), Girls admin → FEMALE (…f.admin).`
    );
  }

  throw new Error(
    `Staff row ${rowNum}: gender is required for Substitute (MALE or FEMALE). ` +
      `Substitutes are section-scoped like admins, not assigned to a classroom.`
  );
}

function assertNoClassroom(
  row: RowRecord,
  rowNum: number,
  roleLabel: string
): void {
  if (row.grade?.trim() || row.section?.trim()) {
    throw new Error(
      `Staff row ${rowNum}: ${roleLabel} must not have grade/section. ` +
        `Leave those blank.`
    );
  }
}

/** Resolve the app login for a Staff import row from school code + role scope. */
export function resolveImportStaffLoginUserId(
  cityCode: string,
  row: RowRecord,
  rowNum: number
): {
  loginUserId: string;
  roleCode: ImportStaffRoleCode;
  gender: "MALE" | "FEMALE";
} {
  const roleCode = normalizeImportStaffRole(row.staff_role, rowNum);
  const gender = resolveStaffGender(row, rowNum, roleCode);

  if (roleCode === "PRINCIPAL") {
    assertNoClassroom(row, rowNum, "Principal");
    return {
      loginUserId: deriveStaffLoginUserId({
        cityCode,
        roleCode: "PRINCIPAL",
      }),
      roleCode,
      gender,
    };
  }

  if (roleCode === "SCHOOL_ADMIN") {
    assertNoClassroom(row, rowNum, "School Admin");
    return {
      loginUserId: deriveStaffLoginUserId({
        cityCode,
        roleCode: "SCHOOL_ADMIN",
        gender,
      }),
      roleCode,
      gender,
    };
  }

  if (roleCode === "SUBSTITUTE") {
    assertNoClassroom(row, rowNum, "Substitute");
    return {
      loginUserId: deriveStaffLoginUserId({
        cityCode,
        roleCode: "SUBSTITUTE",
        gender,
      }),
      roleCode,
      gender,
    };
  }

  if (!row.grade?.trim() || !row.section?.trim()) {
    throw new Error(
      `Staff row ${rowNum}: Teacher requires grade and section.`
    );
  }

  const gradeNum = normalizeGrade(row.grade);
  const sectionName = normalizeSection(row.section);
  return {
    loginUserId: deriveStaffLoginUserId({
      cityCode,
      roleCode: "TEACHER",
      grade: gradeNum,
      section: sectionName,
    }),
    roleCode,
    gender,
  };
}

function loginDerivationHint(roleCode: ImportStaffRoleCode): string {
  switch (roleCode) {
    case "PRINCIPAL":
      return "school code → {code}.principal";
    case "SCHOOL_ADMIN":
      return "school code + gender → {code}.m.admin / {code}.f.admin";
    case "SUBSTITUTE":
      return "school code + gender";
    case "TEACHER":
      return "school code + grade/section";
  }
}

export type StaffValidationSummary = {
  staff: number;
  principals: number;
  admins: number;
  teachers: number;
  substitutes: number;
  rolesChecked: number;
  classrooms: number;
};

/**
 * Validate Staff sheet:
 * - Principal: no classroom; gender required; login {code}.principal
 * - School Admin: no classroom; gender required; login {code}.m/f.admin
 * - Teacher: grade + section required; one teacher per grade + section
 * - Substitute: no classroom; gender required (Boys/Girls section scope)
 * - Derived login exists in app_users, is active, and belongs to the school
 */
export async function validateImportStaff(
  prisma: PrismaClient,
  staffRows: RowRecord[],
  schoolId: string,
  cityCode: string
): Promise<StaffValidationSummary> {
  const classroomOwners = new Map<string, string>();
  let principals = 0;
  let admins = 0;
  let teachers = 0;
  let substitutes = 0;

  const roleRows = await prisma.role.findMany({
    where: { code: { in: [...IMPORT_ALLOWED_ROLES] } },
    select: { id: true, code: true },
  });
  const roleByCode = new Map(roleRows.map((role) => [role.code, role]));

  for (const code of IMPORT_ALLOWED_ROLES) {
    if (!roleByCode.has(code)) {
      throw new Error(
        `Role "${code}" does not exist in the roles table. Run npm run db:seed.`
      );
    }
  }

  for (const [index, row] of staffRows.entries()) {
    const rowNum = index + 2;
    const { loginUserId, roleCode } = resolveImportStaffLoginUserId(
      cityCode,
      row,
      rowNum
    );

    const role = roleByCode.get(roleCode);
    if (!role) {
      throw new Error(
        `Staff row ${rowNum}: staff_role "${roleCode}" does not exist in roles.`
      );
    }

    if (roleCode === "PRINCIPAL") {
      principals++;
    } else if (roleCode === "SCHOOL_ADMIN") {
      admins++;
    } else if (roleCode === "SUBSTITUTE") {
      substitutes++;
    } else {
      teachers++;
      const gradeNum = normalizeGrade(row.grade);
      const sectionName = normalizeSection(row.section);
      const classroomKey = `${gradeNum}|${sectionName}`;
      const label = classroomLabel(gradeNum, sectionName);
      const existingOwner = classroomOwners.get(classroomKey);
      if (existingOwner) {
        throw new Error(
          `Staff row ${rowNum}: classroom ${label} is already assigned to "${existingOwner}". ` +
            `Only one teacher per grade + section is allowed.`
        );
      }
      classroomOwners.set(classroomKey, loginUserId);
    }

    const appUser = await prisma.appUser.findUnique({
      where: { userId: loginUserId },
      select: {
        id: true,
        isActive: true,
        roles: { include: { role: { select: { code: true } } } },
        schools: { where: { schoolId }, select: { schoolId: true } },
      },
    });
    if (!appUser) {
      throw new Error(
        `Staff row ${rowNum}: app user "${loginUserId}" does not exist ` +
          `(derived from ${loginDerivationHint(roleCode)}). ` +
          `Create default school users in the app before importing.`
      );
    }
    if (!appUser.isActive) {
      throw new Error(
        `Staff row ${rowNum}: app user "${loginUserId}" is inactive.`
      );
    }

    const userRoleCodes = appUser.roles.map((ur) => ur.role.code);
    const isGlobal = userRoleCodes.some((code) => isGlobalStaffRole(code));
    const hasSchoolAccess = appUser.schools.length > 0;
    if (!isGlobal && !hasSchoolAccess) {
      throw new Error(
        `Staff row ${rowNum}: app user "${loginUserId}" is not assigned to this school. ` +
          `Add the user to the school (user_schools) before importing.`
      );
    }

    if (!userRoleCodes.includes(roleCode) && !isGlobal) {
      throw new Error(
        `Staff row ${rowNum}: app user "${loginUserId}" does not have role "${roleCode}" in user_roles. ` +
          `Assign that role in the app before importing.`
      );
    }
  }

  return {
    staff: staffRows.length,
    principals,
    admins,
    teachers,
    substitutes,
    rolesChecked: staffRows.length,
    classrooms: classroomOwners.size,
  };
}

/**
 * Ensure every student grade + section has a Teacher on the Staff sheet.
 * Enrollments resolve staff via classroom (grade + section).
 */
export function validateStudentTeacherCoverage(
  staffRows: RowRecord[],
  studentRows: RowRecord[]
): void {
  const teacherClassrooms = new Set<string>();

  for (const row of staffRows) {
    if (normalizeStaffRole(row.staff_role) !== "TEACHER") continue;
    const gradeNum = normalizeGrade(row.grade);
    const sectionName = normalizeSection(row.section);
    teacherClassrooms.add(classroomLabel(gradeNum, sectionName));
  }

  for (const [index, row] of studentRows.entries()) {
    const rowNum = index + 2;
    const gradeNum = normalizeGrade(row.grade);
    const sectionName = normalizeSection(row.section);
    const key = classroomLabel(gradeNum, sectionName);
    if (!teacherClassrooms.has(key)) {
      throw new Error(
        `Students row ${rowNum}: no Staff Teacher for ${key}. ` +
          `Add a Teacher row with matching grade + section (enrollment links by classroom).`
      );
    }
  }
}

export function formatStaffValidation(summary: StaffValidationSummary): string {
  return [
    "Staff validation:",
    `  Staff rows: ${summary.staff} ` +
      `(${summary.principals} principal, ${summary.admins} admin, ` +
      `${summary.teachers} teachers, ${summary.substitutes} substitutes)`,
    `  Roles checked against roles table: ${summary.rolesChecked}`,
    `  Unique teacher classrooms (grade + section): ${summary.classrooms}`,
  ].join("\n");
}

export function isImportClassroomRole(roleCode: string): boolean {
  return roleCode === "TEACHER";
}

export function isImportNonClassroomRole(roleCode: string): boolean {
  return NON_CLASSROOM_ROLES.has(roleCode as ImportStaffRoleCode);
}

/** @deprecated Use validateImportStaff */
export const validateImportTeachers = validateImportStaff;
/** @deprecated Use formatStaffValidation */
export const formatTeacherValidation = formatStaffValidation;
/** @deprecated Use StaffValidationSummary */
export type TeacherValidationSummary = StaffValidationSummary;
