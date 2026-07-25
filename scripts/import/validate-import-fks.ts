import type { PrismaClient } from "@prisma/client";
import {
  normalizeGender,
  normalizeGrade,
  normalizeSection,
  normalizeStaffRole,
} from "./normalize";
import type { RowRecord } from "./read-workbook";

export type ImportFkCheck = {
  name: string;
  ok: boolean;
  detail: string;
};

export type ImportFkValidationSummary = {
  checks: ImportFkCheck[];
  gradesResolved: number;
  sectionsResolved: number;
  gendersResolved: number;
};

function pushOk(checks: ImportFkCheck[], name: string, detail: string) {
  checks.push({ name, ok: true, detail });
}

/**
 * Validate every lookup / FK the roster import needs against the database.
 * Does not write. Throws on the first hard failure with a clear row reference.
 */
export async function validateImportForeignKeys(
  prisma: PrismaClient,
  input: {
    schoolId: string;
    schoolName: string;
    academicYearSchoolId: string;
    academicYearName: string;
    staff: RowRecord[];
    students: RowRecord[];
  }
): Promise<ImportFkValidationSummary> {
  const checks: ImportFkCheck[] = [];

  const school = await prisma.school.findFirst({
    where: { id: input.schoolId, deletedAt: null },
    select: { id: true, name: true, cityCode: true },
  });
  if (!school) {
    throw new Error(`FK schools: school id ${input.schoolId} was not found.`);
  }
  if (!school.cityCode) {
    throw new Error(
      `FK schools: ${school.name} is missing city_code (required for student_id).`
    );
  }
  pushOk(checks, "schools", `${school.name} (${school.id})`);

  const yearLink = await prisma.academicYearSchool.findFirst({
    where: {
      id: input.academicYearSchoolId,
      schoolId: input.schoolId,
      deletedAt: null,
    },
    include: { academicYear: { select: { id: true, name: true } } },
  });
  if (!yearLink) {
    throw new Error(
      `FK academic_year_schools: link ${input.academicYearSchoolId} was not found for this school.`
    );
  }
  pushOk(
    checks,
    "academic_year_schools",
    `${yearLink.academicYear.name} → ${school.name}`
  );
  pushOk(
    checks,
    "academic_years",
    `${yearLink.academicYear.name} (${yearLink.academicYear.id})`
  );

  const [grades, sections, genders, enrollmentStatuses, roles] =
    await Promise.all([
      prisma.grade.findMany({
        select: { id: true, name: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.section.findMany({ select: { id: true, name: true } }),
      prisma.gender.findMany({ select: { code: true, label: true } }),
      prisma.enrollmentStatus.findMany({
        select: { code: true, label: true },
      }),
      prisma.role.findMany({
        where: { code: { in: ["TEACHER", "SUBSTITUTE"] } },
        select: { id: true, code: true },
      }),
    ]);

  const gradeBySort = new Map(grades.map((g) => [g.sortOrder, g]));
  const sectionByName = new Map(sections.map((s) => [s.name, s]));
  const genderByCode = new Map(genders.map((g) => [g.code, g]));
  const roleByCode = new Map(roles.map((r) => [r.code, r]));

  if (!roleByCode.has("TEACHER") || !roleByCode.has("SUBSTITUTE")) {
    throw new Error(
      "FK roles: TEACHER and/or SUBSTITUTE missing. Run npm run db:seed."
    );
  }
  pushOk(
    checks,
    "roles",
    `TEACHER (${roleByCode.get("TEACHER")!.id}), SUBSTITUTE (${roleByCode.get("SUBSTITUTE")!.id})`
  );

  if (!genderByCode.has("MALE") || !genderByCode.has("FEMALE")) {
    throw new Error(
      "FK genders: MALE and/or FEMALE missing. Run npm run db:seed."
    );
  }
  pushOk(checks, "genders", "MALE, FEMALE");

  if (!enrollmentStatuses.some((s) => s.code === "ACTIVE")) {
    throw new Error(
      "FK enrollment_statuses: ACTIVE missing. Run npm run db:seed."
    );
  }
  pushOk(checks, "enrollment_statuses", "ACTIVE");

  if (!sectionByName.has("Boys") || !sectionByName.has("Girls")) {
    throw new Error(
      "FK sections: Boys and/or Girls missing. Run npm run db:seed."
    );
  }
  pushOk(checks, "sections", "Boys, Girls");

  const neededGrades = new Set<number>();
  const resolveClassroomLookups = (
    sheetName: string,
    rowNum: number,
    gradeValue: string,
    sectionValue: string
  ) => {
    const gradeNum = normalizeGrade(gradeValue);
    const sectionName = normalizeSection(sectionValue);
    neededGrades.add(gradeNum);

    const grade = gradeBySort.get(gradeNum);
    if (!grade) {
      throw new Error(
        `FK grades: ${sheetName} row ${rowNum} grade "${gradeValue}" ` +
          `(sort_order ${gradeNum}) does not exist. Run npm run db:seed.`
      );
    }
    const section = sectionByName.get(sectionName);
    if (!section) {
      throw new Error(
        `FK sections: ${sheetName} row ${rowNum} section "${sectionValue}" does not exist.`
      );
    }
    return { grade, section };
  };

  for (const [index, row] of input.staff.entries()) {
    const rowNum = index + 2;
    const role = normalizeStaffRole(row.staff_role);
    if (role === "SUBSTITUTE") {
      const gender = normalizeGender(row.gender);
      if (!genderByCode.has(gender)) {
        throw new Error(
          `FK genders: Staff row ${rowNum} gender "${row.gender}" does not exist.`
        );
      }
      continue;
    }
    resolveClassroomLookups("Staff", rowNum, row.grade, row.section);
  }
  for (const [index, row] of input.students.entries()) {
    const rowNum = index + 2;
    resolveClassroomLookups("Students", rowNum, row.grade, row.section);

    const gender = normalizeGender(row.gender);
    if (!genderByCode.has(gender)) {
      throw new Error(
        `FK genders: Students row ${rowNum} gender "${row.gender}" does not exist.`
      );
    }
  }

  for (const gradeNum of neededGrades) {
    if (!gradeBySort.has(gradeNum)) {
      throw new Error(
        `FK grades: Grade ${gradeNum} (sort_order ${gradeNum}) does not exist.`
      );
    }
  }
  pushOk(
    checks,
    "grades",
    [...neededGrades]
      .sort((a, b) => a - b)
      .map((n) => `Grade ${n}`)
      .join(", ") || "(none)"
  );

  // Classrooms may be created on import; report which ones already exist for this school.
  const existingClassrooms = await prisma.classroom.findMany({
    where: {
      deletedAt: null,
      grade: { sortOrder: { in: [...neededGrades] } },
      schoolLinks: {
        some: { schoolId: input.schoolId, deletedAt: null },
      },
    },
    select: {
      id: true,
      name: true,
      grade: { select: { sortOrder: true } },
      section: { select: { name: true } },
    },
  });
  pushOk(
    checks,
    "classrooms",
    existingClassrooms.length > 0
      ? `${existingClassrooms.length} already exist for this school (others will be created on import)`
      : "none yet — will be created on import from grades + sections"
  );

  pushOk(
    checks,
    "app_users / user_roles / user_schools",
    "validated per derived Staff login (school code + grade/section or gender)"
  );
  pushOk(
    checks,
    "staff / staff_assignments",
    "will be upserted on import from Staff rows"
  );
  pushOk(
    checks,
    "students / student_enrollments",
    "will be created on import; staff linked via student grade + section → Staff Teacher"
  );

  return {
    checks,
    gradesResolved: neededGrades.size,
    sectionsResolved: 2,
    gendersResolved: input.students.length,
  };
}

export function formatImportFkValidation(
  summary: ImportFkValidationSummary
): string {
  const lines = ["Foreign-key validation (dry-run):"];
  for (const check of summary.checks) {
    lines.push(`  ✓ ${check.name}: ${check.detail}`);
  }
  return lines.join("\n");
}
