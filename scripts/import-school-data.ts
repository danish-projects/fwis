/**
 * Import historical school data from the FWIS Excel template into Supabase/Postgres.
 *
 * Usage:
 *   npm run import:template
 *   npm run import:school -- --file templates/houston-2024-2025.xlsx --dry-run
 *   npm run import:school -- --file templates/houston-2024-2025.xlsx
 */
import { config } from "dotenv";
import path from "node:path";
import { createPrismaClient } from "../src/lib/prisma";
import { generateCalendarDaysForYear } from "../src/lib/calendar/bootstrap-calendar-days";
import { computeAndSaveEnrollmentGrade } from "../src/lib/grades/compute-enrollment-grade";
import { SUPER_ADMIN_ID } from "./demo-users";
import {
  ASSESSMENT_FIELD_MAP,
  assertStudentIdMatchesSchool,
  classroomLabel,
  normalizeAttendanceStatus,
  normalizeGender,
  normalizeGrade,
  normalizeSection,
  normalizeSessionType,
  normalizeStudentId,
  parseDate,
  parseOptionalScore,
  studentKey,
} from "./import/normalize";
import { readImportWorkbook } from "./import/read-workbook";
import { resolveEnrollmentId } from "./import/resolve-enrollment";
import { assertAcademicYearScope, assertSchoolScope } from "./import/validate-scope";
import {
  validateImportStudentReferences,
  formatStudentReferenceValidation,
} from "./import/validate-student-ids";
import {
  validateImportCalendar,
  formatCalendarValidation,
} from "./import/validate-calendar";
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

async function main() {
  const fileArg = getArg("--file");
  const dryRun = process.argv.includes("--dry-run");
  const autoConfirm = process.argv.includes("--yes");

  if (!fileArg) {
    console.error(
      "Usage: npm run import:school -- --file <path-to-xlsx> [--dry-run] [--yes]"
    );
    console.error("  --dry-run  Validate file and show counts without writing");
    console.error("  --yes      Skip prompt and delete existing school/year data");
    process.exit(1);
  }

  const filePath = path.resolve(fileArg);
  console.log(`Reading ${filePath}${dryRun ? " (dry run)" : ""}...\n`);

  const data = await readImportWorkbook(filePath);

  if (data.schoolSetup.length !== 1) {
    throw new Error(
      `School_Setup must contain exactly one row (found ${data.schoolSetup.length}).`
    );
  }

  const setup = data.schoolSetup[0];
  const city = setup.city.trim();
  const state = setup.state.trim().toUpperCase();
  const academicYearName = setup.academic_year.trim();
  const yearStart = parseDate(setup.year_start_date, "year_start_date");
  const yearEnd = parseDate(setup.year_end_date, "year_end_date");

  data.teachers.forEach((row, i) =>
    assertSchoolScope(row, "Teachers", i + 2, city, state)
  );
  data.students.forEach((row, i) => {
    assertSchoolScope(row, "Students", i + 2, city, state);
    assertAcademicYearScope(row, "Students", i + 2, academicYearName);
  });
  data.attendance.forEach((row, i) => {
    assertSchoolScope(row, "Attendance", i + 2, city, state);
    assertAcademicYearScope(row, "Attendance", i + 2, academicYearName);
  });
  data.assessments.forEach((row, i) => {
    assertSchoolScope(row, "Assessments", i + 2, city, state);
    assertAcademicYearScope(row, "Assessments", i + 2, academicYearName);
  });

  const expectedCityCode = deriveCityCode(city);
  const studentValidation = validateImportStudentReferences(
    data.students,
    data.attendance,
    data.assessments,
    expectedCityCode
  );
  const calendarValidation = validateImportCalendar(
    yearStart,
    yearEnd,
    data.calendarOptional,
    data.attendance,
    data.assessments,
    data.students
  );

  console.log("Import summary:");
  console.log(`  School:        ${setup.school_name} (${city}, ${state})`);
  console.log(`  Academic year: ${academicYearName}`);
  console.log(`  Teachers:      ${data.teachers.length}`);
  console.log(`  Students:      ${data.students.length}`);
  console.log(`  Attendance:    ${data.attendance.length}`);
  console.log(`  Assessments:   ${data.assessments.length}`);
  console.log(`  Calendar rows: ${data.calendarOptional.length} (optional)`);
  console.log("");
  console.log(formatStudentReferenceValidation(studentValidation));
  console.log("");
  console.log(formatCalendarValidation(calendarValidation));
  console.log("");

  const school = await prisma.school.findFirst({
    where: { city, state, deletedAt: null },
  });

  if (!school && !dryRun) {
    throw new Error(
      `School not found for ${city}, ${state}. Create the school in FWIS first or check city/state spelling.`
    );
  }

  let existingCounts = null;
  let academicYearId: string | null = null;

  if (school) {
    const existingYear = await prisma.academicYear.findFirst({
      where: { schoolId: school.id, name: academicYearName, deletedAt: null },
      select: { id: true },
    });

    if (existingYear) {
      academicYearId = existingYear.id;
      existingCounts = await countSchoolYearImportData(
        prisma,
        school.id,
        existingYear.id
      );

      if (hasExistingSchoolYearData(existingCounts)) {
        console.log("Existing database records for this school + academic year:");
        console.log(formatSchoolYearCounts(existingCounts));
        console.log("");
      }
    }
  }

  if (dryRun) {
    if (!school) {
      console.log(`School not found in database: ${city}, ${state}`);
    } else if (!existingCounts || !hasExistingSchoolYearData(existingCounts)) {
      console.log("No existing import data for this school + academic year.");
    } else {
      console.log(
        "Re-import will prompt to delete the records above (this school/year only)."
      );
      console.log('Use --yes to skip the prompt: npm run import:school -- --file ... --yes');
    }
    console.log("\nDry run complete — all validations passed, no database changes made.");
    return;
  }

  if (!school) {
    throw new Error(
      `School not found for ${city}, ${state}. Create the school in FWIS first or check city/state spelling.`
    );
  }

  const scopedSchool = school;
  let schoolCityCode = scopedSchool.cityCode;
  if (!schoolCityCode) {
    schoolCityCode = deriveCityCode(scopedSchool.city);
    await prisma.school.update({
      where: { id: scopedSchool.id },
      data: { cityCode: schoolCityCode },
    });
  }

  if (existingCounts && hasExistingSchoolYearData(existingCounts) && academicYearId) {
    let confirmed = autoConfirm;

    if (!confirmed) {
      confirmed = await confirmSchoolYearPurge({
        schoolName: setup.school_name.trim() || scopedSchool.name,
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
      scopedSchool.id,
      academicYearId
    );
    console.log("Deleted:");
    console.log(formatSchoolYearCounts(purged));
    if (purged.orphanStudentsRemoved > 0) {
      console.log(`  Orphan students:  ${purged.orphanStudentsRemoved}`);
    }
    console.log("");
  }

  let academicYear = await prisma.academicYear.findFirst({
    where: { schoolId: scopedSchool.id, name: academicYearName, deletedAt: null },
  });

  if (!academicYear) {
    academicYear = await prisma.academicYear.create({
      data: {
        schoolId: scopedSchool.id,
        name: academicYearName,
        startDate: yearStart,
        endDate: yearEnd,
        isActive: false,
      },
    });
    console.log(`Created academic year: ${academicYearName}`);
  }

  if (data.calendarOptional.length > 0) {
    for (const row of data.calendarOptional) {
      const date = parseDate(row.date, "calendar date");
      const sessionType = normalizeSessionType(row.session_type || "INSTRUCTIONAL");
      const lessonPlanNumber = row.lesson_plan_number
        ? Number(row.lesson_plan_number)
        : row.sunday_number
          ? Number(row.sunday_number)
          : undefined;

      await prisma.academicCalendarDay.upsert({
        where: {
          academicYearId_date: {
            academicYearId: academicYear.id,
            date,
          },
        },
        update: {
          sessionType,
          ...(lessonPlanNumber != null
            ? { lessonPlanNumber }
            : { lessonPlanNumber: null }),
        },
        create: {
          academicYearId: academicYear.id,
          date,
          sessionType,
          lessonPlanNumber: lessonPlanNumber ?? null,
        },
      });
    }
  } else {
    const calendarResult = await generateCalendarDaysForYear(
      academicYear.id,
      yearStart,
      yearEnd
    );
    console.log(
      `Calendar days: ${calendarResult.created} created, ${calendarResult.skipped} already existed`
    );
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
    if (!grade || !section) {
      throw new Error(`Missing grade/section setup for ${classroomLabel(gradeNum, sectionName)}`);
    }

    return prisma.classroom.upsert({
      where: {
        schoolId_gradeId_sectionId: {
          schoolId: scopedSchool.id,
          gradeId: grade.id,
          sectionId: section.id,
        },
      },
      update: { name: classroomLabel(gradeNum, sectionName), isActive: true },
      create: {
        schoolId: scopedSchool.id,
        gradeId: grade.id,
        sectionId: section.id,
        name: classroomLabel(gradeNum, sectionName),
      },
    });
  }

  const teacherByEmail = new Map<string, string>();

  for (const row of data.teachers) {
    const email = row.email.trim().toLowerCase();
    const classroom = await resolveClassroom(row.grade, row.section);
    const sectionName = normalizeSection(row.section);
    const gender = sectionName === "Boys" ? "MALE" : "FEMALE";

    const teacher = await prisma.teacher.upsert({
      where: {
        schoolId_email: { schoolId: scopedSchool.id, email },
      },
      update: {
        gender,
        firstName: row.first_name.trim(),
        lastName: row.last_name.trim(),
        phone: row.phone?.trim() || null,
        isActive: true,
        deletedAt: null,
      },
      create: {
        schoolId: scopedSchool.id,
        gender,
        firstName: row.first_name.trim(),
        lastName: row.last_name.trim(),
        email,
        phone: row.phone?.trim() || null,
      },
    });

    await prisma.teacherClassroom.deleteMany({ where: { teacherId: teacher.id } });
    await prisma.teacherClassroom.create({
      data: { teacherId: teacher.id, classroomId: classroom.id },
    });

    teacherByEmail.set(email, teacher.id);
  }
  console.log(`Teachers imported: ${teacherByEmail.size}`);

  const enrollmentByStudentId = new Map<string, string>();
  const enrollmentByStudentKey = new Map<string, string>();

  for (const row of data.students) {
    const gradeNum = normalizeGrade(row.grade);
    const sectionName = normalizeSection(row.section);
    const gender = normalizeGender(row.gender);
    const teacherEmail = row.teacher_email.trim().toLowerCase();
    const teacherId = teacherByEmail.get(teacherEmail);
    if (!teacherId) {
      throw new Error(`Unknown teacher_email "${row.teacher_email}" for student ${row.first_name} ${row.last_name}`);
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

      const pii = encryptStudentPiiForDb({
        dateOfBirth: null,
        parentName: row.parent_name?.trim() || null,
        parentPhone: row.parent_phone?.trim() || null,
        parentEmail: row.parent_email?.trim() || null,
        address: null,
        emergencyContact: null,
      });
      return tx.student.create({
        data: {
          firstName: row.first_name.trim(),
          lastName: row.last_name.trim(),
          gender,
          studentNumber,
          originSchoolId: scopedSchool.id,
          ...pii,
          enrollmentDate: row.enrollment_date
            ? parseDate(row.enrollment_date, "enrollment_date")
            : yearStart,
        },
      });
    });

    const enrollment = await prisma.studentEnrollment.create({
      data: {
        studentId: student.id,
        schoolId: scopedSchool.id,
        academicYearId: academicYear.id,
        classroomId: classroom.id,
        teacherId,
        status: "ACTIVE",
        enrollmentDate: row.enrollment_date
          ? parseDate(row.enrollment_date, "enrollment_date")
          : yearStart,
      },
    });

    enrollmentByStudentId.set(student.studentNumber!, enrollment.id);
    enrollmentByStudentKey.set(
      studentKey(row.first_name, row.last_name, gradeNum, sectionName),
      enrollment.id
    );
  }
  console.log(`Students/enrollments imported: ${enrollmentByStudentId.size}`);

  const enrollmentMaps = {
    byStudentId: enrollmentByStudentId,
    byStudentKey: enrollmentByStudentKey,
  };

  const calendarDays = await prisma.academicCalendarDay.findMany({
    where: { academicYearId: academicYear.id, deletedAt: null },
  });
  const calendarByDate = new Map(
    calendarDays.map((d) => [d.date.toISOString().slice(0, 10), d.id])
  );

  let attendanceCount = 0;
  for (const [index, row] of data.attendance.entries()) {
    const enrollmentId = resolveEnrollmentId(
      enrollmentMaps,
      row,
      `Attendance row ${index + 2}`
    );

    const dateKey = parseDate(row.date, "attendance date").toISOString().slice(0, 10);
    const calendarDayId = calendarByDate.get(dateKey);
    if (!calendarDayId) {
      throw new Error(`No calendar day for attendance date ${dateKey}. Add it to Calendar_Optional or extend the academic year.`);
    }

    await prisma.attendance.upsert({
      where: {
        enrollmentId_calendarDayId: { enrollmentId, calendarDayId },
      },
      update: {
        status: normalizeAttendanceStatus(row.status),
        recordedById: SUPER_ADMIN_ID,
      },
      create: {
        enrollmentId,
        calendarDayId,
        status: normalizeAttendanceStatus(row.status),
        recordedById: SUPER_ADMIN_ID,
      },
    });
    attendanceCount++;
  }
  console.log(`Attendance records imported: ${attendanceCount}`);

  let assessmentCount = 0;
  for (const [index, row] of data.assessments.entries()) {
    const enrollmentId = resolveEnrollmentId(
      enrollmentMaps,
      row,
      `Assessments row ${index + 2}`
    );

    for (const { column, type } of ASSESSMENT_FIELD_MAP) {
      const score = parseOptionalScore(row[column]);
      if (score == null) continue;

      await prisma.assessmentScore.upsert({
        where: {
          enrollmentId_type: { enrollmentId, type },
        },
        update: { score, recordedById: SUPER_ADMIN_ID },
        create: {
          enrollmentId,
          type,
          score,
          recordedById: SUPER_ADMIN_ID,
        },
      });
      assessmentCount++;
    }

    await computeAndSaveEnrollmentGrade(enrollmentId);
  }
  console.log(`Assessment scores imported: ${assessmentCount}`);
  console.log("\nImport complete.");
}

main()
  .catch((err) => {
    console.error("\nImport failed:", err.message ?? err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
