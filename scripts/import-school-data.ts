/**
 * Import Staff + Students roster from the FWIS Excel template.
 * School, academic year link, and app_users must already exist.
 *
 * Usage:
 *   npm run import:template
 *   npm run import:school -- --file templates/houston-2024-2025.xlsx --dry-run
 *   npm run import:school -- --file templates/houston-2024-2025.xlsx
 */
import { config } from "dotenv";
import path from "node:path";
import { createPrismaClient } from "../src/lib/prisma";
import { ensureClassroomForSchool } from "../src/lib/classrooms/ensure-classroom-for-school";
import {
  assertStudentIdMatchesSchool,
  classroomLabel,
  normalizeGender,
  normalizeGrade,
  normalizeSection,
  normalizeStudentId,
  parseDate,
} from "./import/normalize";
import { readImportWorkbook } from "./import/read-workbook";
import { assertAcademicYearScope, assertSchoolScope } from "./import/validate-scope";
import {
  validateImportStudents,
  formatStudentReferenceValidation,
} from "./import/validate-student-ids";
import {
  validateImportStaff,
  validateStudentTeacherCoverage,
  formatStaffValidation,
  resolveImportStaffLoginUserId,
} from "./import/validate-teachers";
import {
  validateImportForeignKeys,
  formatImportFkValidation,
} from "./import/validate-import-fks";
import { confirmSchoolYearPurge } from "./import/prompt-confirm";
import { encryptStudentPiiForDb } from "../src/lib/students/student-pii";
import {
  adoptStudentNumberSequence,
  allocateStudentNumber,
  deriveCityCode,
} from "../src/lib/students/student-number";
import {
  countSchoolYearImportData,
  formatSchoolYearCounts,
  hasExistingSchoolYearData,
  purgeSchoolYearImportData,
} from "./import/purge-school-year";
import { requireExistingSchoolYear } from "./import/resolve-school-year";
import { linkStaffToExistingAppUser } from "./import/ensure-staff-login";
import { ensureRoleByCode } from "../src/lib/roles/ensure-role";

config({ path: ".env.local" });
config({ path: ".env" });

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL or DIRECT_URL is missing in .env.local");
}

const prisma = createPrismaClient(databaseUrl);

function getArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function resolveWorkbookScope(data: {
  staff: Array<Record<string, string>>;
  students: Array<Record<string, string>>;
}) {
  const anchor = data.staff[0] ?? data.students[0];
  if (!anchor) {
    throw new Error("Workbook must include at least one Staff or Students row.");
  }

  const city = anchor.school_city?.trim();
  const state = anchor.school_state?.trim().toUpperCase();
  const academicYearName = anchor.academic_year?.trim();
  if (!city || !state || !academicYearName) {
    throw new Error(
      "school_city, school_state, and academic_year are required on every Staff/Students row."
    );
  }

  data.staff.forEach((row, i) => {
    assertSchoolScope(row, "Staff", i + 2, city, state);
    assertAcademicYearScope(row, "Staff", i + 2, academicYearName);
  });
  data.students.forEach((row, i) => {
    assertSchoolScope(row, "Students", i + 2, city, state);
    assertAcademicYearScope(row, "Students", i + 2, academicYearName);
  });

  return { city, state, academicYearName };
}

async function main() {
  const fileArg = getArg("--file");
  const dryRun = process.argv.includes("--dry-run");
  const autoConfirm = process.argv.includes("--yes");

  if (!fileArg) {
    console.error(
      "Usage: npm run import:school -- --file <path-to-xlsx> [--dry-run] [--yes]"
    );
    console.error("  --dry-run  Validate file and show counts without writing");
    console.error("  --yes      Skip prompt and delete existing school/year roster data");
    process.exit(1);
  }

  const filePath = path.resolve(fileArg);
  console.log(`Reading ${filePath}${dryRun ? " (dry run)" : ""}...\n`);

  const data = await readImportWorkbook(filePath);
  const { city, state, academicYearName } = resolveWorkbookScope(data);

  const { school, schoolLink, academicYear } = await requireExistingSchoolYear(
    prisma,
    city,
    state,
    academicYearName
  );

  if (!school.cityCode) {
    throw new Error(
      `School ${school.name} is missing city_code. Update the school in the app before importing.`
    );
  }

  const expectedCityCode = school.cityCode || deriveCityCode(city);
  const studentValidation = validateImportStudents(data.students, expectedCityCode);
  const staffValidation = await validateImportStaff(
    prisma,
    data.staff,
    school.id,
    school.cityCode
  );
  validateStudentTeacherCoverage(data.staff, data.students);

  const fkValidation = await validateImportForeignKeys(prisma, {
    schoolId: school.id,
    schoolName: school.name,
    academicYearSchoolId: schoolLink.id,
    academicYearName: academicYear.name,
    staff: data.staff,
    students: data.students,
  });

  const existingCounts = await countSchoolYearImportData(
    prisma,
    school.id,
    schoolLink.id
  );

  console.log("Import summary:");
  console.log(`  School:        ${school.name} (${city}, ${state})`);
  console.log(`  Academic year: ${academicYear.name}`);
  console.log(`  Staff:         ${data.staff.length}`);
  console.log(`  Students:      ${data.students.length}`);
  console.log(`  Mode:          ${dryRun ? "DRY RUN (no writes)" : "IMPORT"}`);
  console.log("");
  console.log(formatStaffValidation(staffValidation));
  console.log("");
  console.log(formatStudentReferenceValidation(studentValidation));
  console.log("");
  console.log(formatImportFkValidation(fkValidation));
  console.log("");

  if (hasExistingSchoolYearData(existingCounts)) {
    console.log("Existing database records for this school + academic year:");
    console.log(formatSchoolYearCounts(existingCounts));
    console.log("");
  } else {
    console.log("No existing import data for this school + academic year.");
    console.log("");
  }

  if (dryRun) {
    console.log("Dry run complete — all foreign keys validated; no database changes made.");
    console.log("Re-run without --dry-run to import.");
    return;
  }

  if (hasExistingSchoolYearData(existingCounts)) {
    let confirmed = autoConfirm;
    if (!confirmed) {
      confirmed = await confirmSchoolYearPurge({
        schoolName: school.name,
        city,
        state,
        academicYear: academicYearName,
        countsSummary: formatSchoolYearCounts(existingCounts),
      });
    }

    if (!confirmed) {
      console.log("\nImport cancelled. No data was deleted.");
      return;
    }

    console.log("\nDeleting existing data for this school and academic year only...");
    const purged = await purgeSchoolYearImportData(
      prisma,
      school.id,
      schoolLink.id
    );
    console.log("Deleted:");
    console.log(formatSchoolYearCounts(purged));
    if (purged.orphanStudentsRemoved > 0) {
      console.log(`  Orphan students:  ${purged.orphanStudentsRemoved}`);
    }
    console.log("");
  }

  const grades = await prisma.grade.findMany({ orderBy: { sortOrder: "asc" } });
  const sections = await prisma.section.findMany();
  const sectionByName = new Map(sections.map((s) => [s.name, s]));
  const gradeBySortOrder = new Map(grades.map((g) => [g.sortOrder, g]));

  async function resolveClassroom(gradeValue: string, sectionValue: string) {
    const gradeNum = normalizeGrade(gradeValue);
    const sectionName = normalizeSection(sectionValue);
    const grade = gradeBySortOrder.get(gradeNum);
    const section = sectionByName.get(sectionName);
    if (!grade) {
      throw new Error(
        `Grade "${gradeValue}" (sort_order ${gradeNum}) does not exist. Run npm run db:seed.`
      );
    }
    if (!section) {
      throw new Error(
        `Section "${sectionValue}" does not exist. Run npm run db:seed.`
      );
    }

    const ensured = await ensureClassroomForSchool(prisma, {
      schoolId: school.id,
      gradeId: grade.id,
      sectionId: section.id,
      name: classroomLabel(gradeNum, sectionName),
    });

    return prisma.classroom.findUniqueOrThrow({
      where: { id: ensured.classroomId },
    });
  }

  const staffByClassroom = new Map<string, string>();
  let staffLoginsLinked = 0;
  let staffLoginsExisting = 0;
  let teachersImported = 0;

  for (const [index, row] of data.staff.entries()) {
    const email = row.email.trim().toLowerCase();
    const firstName = row.first_name.trim();
    const lastName = row.last_name.trim();
    const { loginUserId, roleCode, gender } = resolveImportStaffLoginUserId(
      school.cityCode,
      row,
      index + 2
    );
    const role = await ensureRoleByCode(prisma, roleCode);

    const isSubstitute = roleCode === "SUBSTITUTE";
    let classroomId: string | null = null;
    let classroomKey: string | null = null;

    if (!isSubstitute) {
      const classroom = await resolveClassroom(row.grade, row.section);
      classroomId = classroom.id;
      classroomKey = classroomLabel(
        normalizeGrade(row.grade),
        normalizeSection(row.section)
      );
    }

    const staff = await prisma.staff.upsert({
      where: {
        schoolId_email: { schoolId: school.id, email },
      },
      update: {
        gender,
        firstName,
        lastName,
        phone: row.phone?.trim() || null,
        isActive: true,
        deletedAt: null,
      },
      create: {
        schoolId: school.id,
        gender,
        firstName,
        lastName,
        email,
        phone: row.phone?.trim() || null,
      },
    });

    await prisma.staffAssignment.upsert({
      where: {
        staffId_academicYearSchoolId: {
          staffId: staff.id,
          academicYearSchoolId: schoolLink.id,
        },
      },
      update: {
        roleId: role.id,
        classroomId,
      },
      create: {
        staffId: staff.id,
        academicYearSchoolId: schoolLink.id,
        roleId: role.id,
        classroomId,
      },
    });

    const loginResult = await linkStaffToExistingAppUser(prisma, {
      staffId: staff.id,
      loginUserId,
      email,
      fullName: `${firstName} ${lastName}`,
      gender,
      schoolId: school.id,
      roleId: role.id,
    });
    if (loginResult.linked) staffLoginsLinked++;
    else staffLoginsExisting++;

    // Classroom teachers are enrollment targets via student grade + section.
    if (classroomKey) {
      staffByClassroom.set(classroomKey, staff.id);
      teachersImported++;
    }
  }
  console.log(`Staff imported: ${data.staff.length} (${teachersImported} teachers)`);
  console.log(
    `Staff logins: ${staffLoginsLinked} linked, ${staffLoginsExisting} already linked`
  );

  const schoolCityCode = school.cityCode;
  const defaultEnrollmentDate = academicYear.startDate;

  for (const row of data.students) {
    const gender = normalizeGender(row.gender);
    const classroomKey = classroomLabel(
      normalizeGrade(row.grade),
      normalizeSection(row.section)
    );
    const staffId = staffByClassroom.get(classroomKey);
    if (!staffId) {
      throw new Error(
        `No Staff Teacher for ${classroomKey} ` +
          `(student ${row.first_name} ${row.last_name})`
      );
    }

    const explicitStudentId = row.student_id?.trim()
      ? normalizeStudentId(row.student_id)
      : null;
    if (explicitStudentId) {
      assertStudentIdMatchesSchool(explicitStudentId, schoolCityCode, gender);
    }

    const classroom = await resolveClassroom(row.grade, row.section);

    const student = await prisma.$transaction(async (tx) => {
      const studentNumber = explicitStudentId
        ? explicitStudentId
        : await allocateStudentNumber(tx, schoolCityCode, gender);

      if (explicitStudentId) {
        await adoptStudentNumberSequence(tx, studentNumber, gender);
      }

      const parseYesNo = (value: string | undefined): boolean | null => {
        const normalized = value?.trim().toLowerCase();
        if (!normalized) return null;
        if (["yes", "y", "true", "1"].includes(normalized)) return true;
        if (["no", "n", "false", "0"].includes(normalized)) return false;
        return null;
      };

      const pii = encryptStudentPiiForDb({
        dateOfBirth: null,
        emailAddress: row.email_address?.trim() || null,
        emergencyContact: null,
        streetAddress: row.street_address?.trim() || null,
        city: row.city?.trim() || null,
        stateProvince: row.state_province?.trim() || null,
        zipPostalCode: row.zip_postal_code?.trim() || null,
        country: row.country?.trim() || null,
        fatherGuardianFirstName: row.father_guardian_first_name?.trim() || null,
        fatherGuardianLastName: row.father_guardian_last_name?.trim() || null,
        fatherMobileWhatsappNumber:
          row.father_mobile_whatsapp_number?.trim() || null,
        motherGuardianFirstName: row.mother_guardian_first_name?.trim() || null,
        motherGuardianLastName: row.mother_guardian_last_name?.trim() || null,
        motherMobileWhatsappNumber:
          row.mother_mobile_whatsapp_number?.trim() || null,
      });
      return tx.student.create({
        data: {
          firstName: row.first_name.trim(),
          lastName: row.last_name.trim(),
          gender,
          studentNumber,
          originSchoolId: school.id,
          fatherParentalResponsibility: parseYesNo(
            row.father_parental_responsibility
          ),
          motherParentalResponsibility: parseYesNo(
            row.mother_parental_responsibility
          ),
          ...pii,
          enrollmentDate: row.enrollment_date
            ? parseDate(row.enrollment_date, "enrollment_date")
            : defaultEnrollmentDate,
        },
      });
    });

    await prisma.studentEnrollment.create({
      data: {
        studentId: student.id,
        schoolId: school.id,
        academicYearSchoolId: schoolLink.id,
        classroomId: classroom.id,
        staffId,
        status: "ACTIVE",
        enrollmentDate: row.enrollment_date
          ? parseDate(row.enrollment_date, "enrollment_date")
          : defaultEnrollmentDate,
      },
    });
  }
  console.log(`Students/enrollments imported: ${data.students.length}`);
  console.log("\nImport complete.");
}

main()
  .catch((err) => {
    console.error("\nImport failed:", err.message ?? err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
