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

const IMPORT_ALLOWED_ROLES = new Set(["TEACHER", "SUBSTITUTE"]);

function normalizeImportStaffRole(value: string | undefined, rowNum: number) {
  const role = normalizeStaffRole(value);
  if (!IMPORT_ALLOWED_ROLES.has(role)) {
    throw new Error(
      `Staff row ${rowNum}: staff_role "${value}" is not allowed. Use Teacher or Substitute.`
    );
  }
  return role;
}

function resolveStaffGender(row: RowRecord, rowNum: number, roleCode: string) {
  const rawGender = row.gender?.trim();
  if (rawGender) {
    return normalizeGender(rawGender);
  }

  if (roleCode === "SUBSTITUTE") {
    throw new Error(
      `Staff row ${rowNum}: gender is required for Substitute (MALE or FEMALE). ` +
        `Substitutes are section-scoped like admins, not assigned to a classroom.`
    );
  }

  // Teachers: derive from section when gender column is blank.
  const sectionName = normalizeSection(row.section);
  return sectionName === "Boys" ? ("MALE" as const) : ("FEMALE" as const);
}

/** Resolve the app login for a Staff import row from school code + role scope. */
export function resolveImportStaffLoginUserId(
  cityCode: string,
  row: RowRecord,
  rowNum: number
): { loginUserId: string; roleCode: "TEACHER" | "SUBSTITUTE"; gender: "MALE" | "FEMALE" } {
  const roleCode = normalizeImportStaffRole(row.staff_role, rowNum) as
    | "TEACHER"
    | "SUBSTITUTE";
  const gender = resolveStaffGender(row, rowNum, roleCode);

  if (roleCode === "SUBSTITUTE") {
    if (row.grade?.trim() || row.section?.trim()) {
      throw new Error(
        `Staff row ${rowNum}: Substitute must not have grade/section. ` +
          `Leave those blank; use gender (MALE/FEMALE) for Boys/Girls section scope.`
      );
    }
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

export type StaffValidationSummary = {
  staff: number;
  teachers: number;
  substitutes: number;
  rolesChecked: number;
  classrooms: number;
};

/**
 * Validate Staff sheet:
 * - Teacher: grade + section required; one teacher per grade + section
 * - Substitute: no classroom; gender required (Boys/Girls section scope)
 * - Login user_id is derived from school code + grade/section (or gender)
 * - Derived login exists in app_users, is active, and belongs to the school
 */
export async function validateImportStaff(
  prisma: PrismaClient,
  staffRows: RowRecord[],
  schoolId: string,
  cityCode: string
): Promise<StaffValidationSummary> {
  const classroomOwners = new Map<string, string>();
  const seenUserIds = new Set<string>();
  let teachers = 0;
  let substitutes = 0;

  const roleRows = await prisma.role.findMany({
    where: { code: { in: ["TEACHER", "SUBSTITUTE"] } },
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

    if (seenUserIds.has(loginUserId)) {
      throw new Error(
        `Staff row ${rowNum}: duplicate derived login "${loginUserId}" on the Staff sheet.`
      );
    }
    seenUserIds.add(loginUserId);

    const role = roleByCode.get(roleCode);
    if (!role) {
      throw new Error(
        `Staff row ${rowNum}: staff_role "${roleCode}" does not exist in roles.`
      );
    }

    if (roleCode === "SUBSTITUTE") {
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
          `(derived from school code + ${
            roleCode === "TEACHER" ? "grade/section" : "gender"
          }). ` +
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
    `  Staff rows: ${summary.staff} (${summary.teachers} teachers, ${summary.substitutes} substitutes)`,
    `  Roles checked against roles table: ${summary.rolesChecked}`,
    `  Unique teacher classrooms (grade + section): ${summary.classrooms}`,
  ].join("\n");
}

/** @deprecated Use validateImportStaff */
export const validateImportTeachers = validateImportStaff;
/** @deprecated Use formatStaffValidation */
export const formatTeacherValidation = formatStaffValidation;
/** @deprecated Use StaffValidationSummary */
export type TeacherValidationSummary = StaffValidationSummary;
