"use server";

import { prisma } from "@/lib/prisma";
import { assertAcademicYearRecordAccess } from "@/lib/auth/academic-year-access";
import { requirePermission, requireRole } from "@/lib/auth/session";
import {
  buildAssessmentRow,
  buildSchoolBackupWorkbook,
  formatAttendanceStatusForExport,
  formatDateForExport,
  type SchoolYearBackupData,
} from "@/lib/export/build-school-backup-workbook";
import { decryptStudentPii } from "@/lib/students/student-pii";
import type { AssessmentTypeCode } from "@/lib/setup-types";
import type { SchoolBackupExportInput } from "@/lib/validations/backup";

export async function getSchoolBackupPageContext(schoolId?: string) {
  const user = await requireRole("NIGRA", "SCHOOL_ADMIN");
  await requirePermission("reports:export");

  const schools = await prisma.school.findMany({
    where: user.roles.includes("NIGRA")
      ? { deletedAt: null, isActive: true }
      : { id: { in: user.schoolIds }, deletedAt: null, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, city: true, state: true },
  });

  const resolvedSchoolId =
    schoolId && schools.some((school) => school.id === schoolId)
      ? schoolId
      : schools[0]?.id;

  const academicYears = resolvedSchoolId
    ? await prisma.academicYearSchool.findMany({
        where: { schoolId: resolvedSchoolId, deletedAt: null },
        orderBy: { academicYear: { startDate: "desc" } },
        include: {
          academicYear: {
            select: { id: true, name: true, startDate: true, endDate: true },
          },
        },
      }).then((links) =>
        links.map((link) => ({
          id: link.academicYear.id,
          name: link.academicYear.name,
          isActive: link.isActive,
          startDate: link.academicYear.startDate,
          endDate: link.academicYear.endDate,
        }))
      )
    : [];

  return {
    schools,
    schoolId: resolvedSchoolId ?? null,
    academicYears,
    showSchoolPicker: user.roles.includes("NIGRA") || schools.length > 1,
  };
}

export async function buildSchoolYearBackupBuffer(
  input: SchoolBackupExportInput
): Promise<{ buffer: Buffer; filename: string }> {
  const user = await requireRole("NIGRA", "SCHOOL_ADMIN");
  await requirePermission("reports:export", { schoolId: input.schoolId });
  await assertAcademicYearRecordAccess(user, input.yearId);

  const schoolLink = await prisma.academicYearSchool.findFirst({
    where: {
      academicYearId: input.yearId,
      schoolId: input.schoolId,
      deletedAt: null,
    },
    include: {
      academicYear: true,
      school: true,
    },
  });

  if (!schoolLink) {
    throw new Error("Academic year not found for this school.");
  }

  const year = schoolLink.academicYear;

  const scope = {
    city: schoolLink.school.city,
    state: schoolLink.school.state,
    academicYear: year.name,
  };

  const staffMembers = await prisma.staff.findMany({
    where: { schoolId: input.schoolId, deletedAt: null, isActive: true },
    include: {
      assignments: {
        where: { academicYearSchoolId: schoolLink.id },
        include: {
          role: { select: { code: true } },
          classroom: {
            include: { grade: true, section: true },
          },
        },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const staffRows = staffMembers.flatMap((staff) => {
    const assignment = staff.assignments[0];
    if (!assignment?.classroom) return [];
    return [
      {
        school_city: scope.city,
        school_state: scope.state,
        academic_year: scope.academicYear,
        first_name: staff.firstName,
        last_name: staff.lastName,
        email: staff.email,
        phone: staff.phone ?? "",
        staff_role: assignment.role.code,
        gender: staff.gender ?? "",
        grade: String(assignment.classroom.grade.sortOrder),
        section: assignment.classroom.section.name,
        user_id: staff.userId ?? "",
      },
    ];
  });

  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      schoolId: input.schoolId,
      academicYearSchoolId: schoolLink.id,
      deletedAt: null,
    },
    include: {
      student: true,
      classroom: { include: { grade: true, section: true } },
      staff: { select: { email: true, userId: true } },
      attendance: {
        where: { deletedAt: null },
        include: { calendarDay: { select: { date: true } } },
      },
      assessments: {
        where: { deletedAt: null },
        select: { type: true, score: true },
      },
    },
    orderBy: { enrollmentDate: "asc" },
  });

  enrollments.sort((a, b) => {
    const gradeDiff =
      a.classroom.grade.sortOrder - b.classroom.grade.sortOrder;
    if (gradeDiff !== 0) return gradeDiff;
    return a.student.lastName.localeCompare(b.student.lastName);
  });

  const missingStudentIds: string[] = [];
  const studentRows = [];
  const attendanceRows = [];
  const assessmentRows = [];

  for (const enrollment of enrollments) {
    const student = decryptStudentPii(enrollment.student);
    const studentId = student.studentNumber;

    if (!studentId) {
      missingStudentIds.push(`${student.firstName} ${student.lastName}`);
      continue;
    }

    studentRows.push({
      school_city: scope.city,
      school_state: scope.state,
      academic_year: scope.academicYear,
      student_id: studentId,
      first_name: student.firstName,
      last_name: student.lastName,
      gender: student.gender,
      email_address: student.emailAddress ?? "",
      grade: String(enrollment.classroom.grade.sortOrder),
      section: enrollment.classroom.section.name,
      street_address: student.streetAddress ?? "",
      city: student.city ?? "",
      state_province: student.stateProvince ?? "",
      zip_postal_code: student.zipPostalCode ?? "",
      country: student.country ?? "",
      father_guardian_first_name: student.fatherGuardianFirstName ?? "",
      father_guardian_last_name: student.fatherGuardianLastName ?? "",
      father_parental_responsibility:
        student.fatherParentalResponsibility == null
          ? ""
          : student.fatherParentalResponsibility
            ? "Yes"
            : "No",
      father_mobile_whatsapp_number: student.fatherMobileWhatsappNumber ?? "",
      mother_guardian_first_name: student.motherGuardianFirstName ?? "",
      mother_guardian_last_name: student.motherGuardianLastName ?? "",
      mother_parental_responsibility:
        student.motherParentalResponsibility == null
          ? ""
          : student.motherParentalResponsibility
            ? "Yes"
            : "No",
      mother_mobile_whatsapp_number: student.motherMobileWhatsappNumber ?? "",
      enrollment_date: formatDateForExport(enrollment.enrollmentDate),
    });

    for (const record of enrollment.attendance) {
      attendanceRows.push({
        school_city: scope.city,
        school_state: scope.state,
        academic_year: scope.academicYear,
        student_id: studentId,
        date: formatDateForExport(record.calendarDay.date),
        status: formatAttendanceStatusForExport(record.status),
      });
    }

    const scores: Partial<Record<AssessmentTypeCode, number>> = {};
    for (const assessment of enrollment.assessments) {
      scores[assessment.type as AssessmentTypeCode] = Number(assessment.score);
    }

    assessmentRows.push(buildAssessmentRow(scope, studentId, scores));
  }

  if (missingStudentIds.length > 0) {
    throw new Error(
      `Cannot export backup: ${missingStudentIds.length} student(s) missing student_id: ${missingStudentIds.slice(0, 5).join(", ")}${missingStudentIds.length > 5 ? "…" : ""}`
    );
  }

  const calendarDays = await prisma.academicCalendarDay.findMany({
    where: { academicYearSchoolId: schoolLink.id, deletedAt: null },
    orderBy: { date: "asc" },
    select: { date: true, sessionType: true, lessonPlanNumber: true },
  });

  const calendarRows = calendarDays.map((day) => ({
    date: formatDateForExport(day.date),
    session_type: day.sessionType,
    lesson_plan_number: day.lessonPlanNumber != null ? String(day.lessonPlanNumber) : "",
  }));

  const backupData: SchoolYearBackupData = {
    schoolName: schoolLink.school.name,
    city: scope.city,
    state: scope.state,
    academicYear: scope.academicYear,
    yearStartDate: formatDateForExport(year.startDate),
    yearEndDate: formatDateForExport(year.endDate),
    exportedAt: new Date().toISOString().slice(0, 10),
    staff: staffRows,
    students: studentRows,
    attendance: attendanceRows.sort((a, b) =>
      `${a.student_id}|${a.date}`.localeCompare(`${b.student_id}|${b.date}`)
    ),
    assessments: assessmentRows,
    calendar: calendarRows,
  };

  const buffer = await buildSchoolBackupWorkbook(backupData);
  const safeCity = scope.city.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const safeYear = scope.academicYear.replace(/[^a-zA-Z0-9]+/g, "-");
  const filename = `fwis-backup-${safeCity}-${safeYear}`;

  return { buffer, filename };
}
