import { toLoginUserId } from "@/lib/auth/login-user-id";

/** Grades covered by default classroom teacher logins. */
export const SCHOOL_DEFAULT_TEACHER_GRADES = [1, 2, 3, 4, 5, 6] as const;

export type SchoolDefaultLoginRole =
  | "PRINCIPAL"
  | "SCHOOL_ADMIN"
  | "TEACHER"
  | "SUBSTITUTE";

export type DefaultPasswordRole = SchoolDefaultLoginRole | "NIGRA";

/**
 * Distinct default passwords by role.
 * Override with env (see resolveRoleDefaultPassword).
 */
export const ROLE_DEFAULT_PASSWORDS: Record<DefaultPasswordRole, string> = {
  NIGRA: "FwisMajlis786!",
  PRINCIPAL: "FwisPrincipal786!",
  SCHOOL_ADMIN: "FwisAdmin786!",
  TEACHER: "FwisTeacher786!",
  SUBSTITUTE: "FwisSub786!",
};

/** @deprecated Use ROLE_DEFAULT_PASSWORDS.SCHOOL_ADMIN */
export const DEFAULT_SCHOOL_LOGIN_PASSWORD =
  ROLE_DEFAULT_PASSWORDS.SCHOOL_ADMIN;

/**
 * Login prefix from the 3-letter school city code: "HOU" → "hou".
 */
export function schoolLoginCode(cityCode: string): string {
  const code = cityCode.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!code) {
    throw new Error("School code is required to build default school logins");
  }
  return code;
}

/** @deprecated Prefer schoolLoginCode(cityCode). City slug is no longer used in login IDs. */
export function schoolLoginSlug(city: string): string {
  return city.trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * Derive app login user_id for importable Staff roles.
 * Teacher: `{code}.b.g1` / `{code}.g.g1` from grade + section
 * Substitute: `{code}.m.sub` / `{code}.f.sub` from gender
 */
export function deriveStaffLoginUserId(options: {
  cityCode: string;
  roleCode: "TEACHER" | "SUBSTITUTE";
  grade?: number;
  section?: "Boys" | "Girls";
  gender?: "MALE" | "FEMALE";
}): string {
  const code = schoolLoginCode(options.cityCode);

  if (options.roleCode === "SUBSTITUTE") {
    if (!options.gender) {
      throw new Error("Substitute login requires gender (MALE or FEMALE)");
    }
    return toLoginUserId(
      `${code}.${options.gender === "MALE" ? "m" : "f"}.sub`
    );
  }

  if (options.grade == null || !options.section) {
    throw new Error("Teacher login requires grade and section");
  }
  const sectionLetter = options.section === "Boys" ? "b" : "g";
  return toLoginUserId(`${code}.${sectionLetter}.g${options.grade}`);
}

export function resolveRoleDefaultPassword(
  role: DefaultPasswordRole,
  explicit?: string
): string {
  if (explicit) return explicit;

  switch (role) {
    case "NIGRA":
      return (
        process.env.SEED_SUPER_ADMIN_PASSWORD ?? ROLE_DEFAULT_PASSWORDS.NIGRA
      );
    case "PRINCIPAL":
      return (
        process.env.DEFAULT_PRINCIPAL_PASSWORD ??
        ROLE_DEFAULT_PASSWORDS.PRINCIPAL
      );
    case "SCHOOL_ADMIN":
      return (
        process.env.DEFAULT_ADMIN_PASSWORD ?? ROLE_DEFAULT_PASSWORDS.SCHOOL_ADMIN
      );
    case "TEACHER":
      return (
        process.env.DEFAULT_TEACHER_PASSWORD ??
        process.env.IMPORT_TEACHER_DEFAULT_PASSWORD ??
        ROLE_DEFAULT_PASSWORDS.TEACHER
      );
    case "SUBSTITUTE":
      return (
        process.env.DEFAULT_SUBSTITUTE_PASSWORD ??
        ROLE_DEFAULT_PASSWORDS.SUBSTITUTE
      );
  }
}

export type SchoolDefaultLoginSpec = {
  loginUserId: string;
  fullName: string;
  roleCode: SchoolDefaultLoginRole;
  gender: "MALE" | "FEMALE" | null;
  password: string;
};

/**
 * Standard school logins (17) from school city code, e.g. HOU → hou:
 *   hou.principal
 *   hou.m.admin, hou.f.admin
 *   hou.b.g1–g6, hou.g.g1–g6  (12 teachers)
 *   hou.m.sub, hou.f.sub
 */
export function buildSchoolDefaultLoginSpecs(options: {
  cityCode: string;
  cityLabel?: string;
}): SchoolDefaultLoginSpec[] {
  const code = schoolLoginCode(options.cityCode);
  const cityLabel = (options.cityLabel ?? options.cityCode).trim() || code;

  const specs: Omit<SchoolDefaultLoginSpec, "password">[] = [
    {
      loginUserId: `${code}.principal`,
      fullName: `${cityLabel} Principal`,
      roleCode: "PRINCIPAL",
      gender: null,
    },
    {
      loginUserId: `${code}.m.admin`,
      fullName: `${cityLabel} Boys Admin`,
      roleCode: "SCHOOL_ADMIN",
      gender: "MALE",
    },
    {
      loginUserId: `${code}.f.admin`,
      fullName: `${cityLabel} Girls Admin`,
      roleCode: "SCHOOL_ADMIN",
      gender: "FEMALE",
    },
  ];

  for (const grade of SCHOOL_DEFAULT_TEACHER_GRADES) {
    specs.push({
      loginUserId: deriveStaffLoginUserId({
        cityCode: code,
        roleCode: "TEACHER",
        grade,
        section: "Boys",
      }),
      fullName: `${cityLabel} Grade ${grade} Boys Teacher`,
      roleCode: "TEACHER",
      gender: "MALE",
    });
    specs.push({
      loginUserId: deriveStaffLoginUserId({
        cityCode: code,
        roleCode: "TEACHER",
        grade,
        section: "Girls",
      }),
      fullName: `${cityLabel} Grade ${grade} Girls Teacher`,
      roleCode: "TEACHER",
      gender: "FEMALE",
    });
  }

  specs.push(
    {
      loginUserId: deriveStaffLoginUserId({
        cityCode: code,
        roleCode: "SUBSTITUTE",
        gender: "MALE",
      }),
      fullName: `${cityLabel} Boys Substitute`,
      roleCode: "SUBSTITUTE",
      gender: "MALE",
    },
    {
      loginUserId: deriveStaffLoginUserId({
        cityCode: code,
        roleCode: "SUBSTITUTE",
        gender: "FEMALE",
      }),
      fullName: `${cityLabel} Girls Substitute`,
      roleCode: "SUBSTITUTE",
      gender: "FEMALE",
    }
  );

  return specs.map((spec) => ({
    ...spec,
    loginUserId: toLoginUserId(spec.loginUserId),
    password: resolveRoleDefaultPassword(spec.roleCode),
  }));
}

export const SCHOOL_DEFAULT_LOGIN_COUNT = buildSchoolDefaultLoginSpecs({
  cityCode: "HOU",
  cityLabel: "Houston",
}).length;

/** Unique passwords used by the default school login set (for UI / docs). */
export function defaultSchoolPasswordsByRole(): Record<
  SchoolDefaultLoginRole,
  string
> {
  return {
    PRINCIPAL: resolveRoleDefaultPassword("PRINCIPAL"),
    SCHOOL_ADMIN: resolveRoleDefaultPassword("SCHOOL_ADMIN"),
    TEACHER: resolveRoleDefaultPassword("TEACHER"),
    SUBSTITUTE: resolveRoleDefaultPassword("SUBSTITUTE"),
  };
}
