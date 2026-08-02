"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission, type AuthUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit/create-audit-log";
import {
  assertStudentAccess,
  buildStudentEnrollmentVisibilityFilter,
  buildStudentListFilter,
  mergeStudentQueryFilters,
} from "@/lib/auth/student-access";
import {
  studentSchema,
  studentListSchema,
  studentExportSchema,
  type StudentInput,
} from "@/lib/validations/student";
import { getSelectedAcademicYear, resolveAcademicYearForSchool } from "@/lib/academic-year/resolve-year";
import { isClassroomScopedUser } from "@/lib/auth/section-scope";
import { resolveListSchoolId } from "@/lib/school/resolve-school";
import {
  decryptStudentPii,
  decryptStudentPiiList,
  encryptStudentPiiForDb,
} from "@/lib/students/student-pii";
import { STUDENT_NAME_ORDER_BY } from "@/lib/students/sort-students";
import {
  duplicateStudentUserError,
  throwStudentSaveUserError,
  toStudentSaveUserError,
  type DuplicateMatchReason,
} from "@/lib/students/student-save-errors";
import {
  parseCalendarDateInput,
  schoolTodayUtcDate,
} from "@/lib/calendar/calendar-date";
import { ZodError } from "zod";

async function buildEnrollmentYearFilter(user: AuthUser) {
  const selectedYear = await getSelectedAcademicYear(user);
  const listSchoolId = await resolveListSchoolId(user);

  const classroomScope =
    isClassroomScopedUser(user) && user.classroomIds.length > 0
      ? { classroomId: { in: user.classroomIds } }
      : {};

  const base: Prisma.StudentEnrollmentWhereInput = {
    deletedAt: null,
    status: "ACTIVE" as const,
    ...classroomScope,
  };

  if (!listSchoolId) {
    return base;
  }

  if (selectedYear) {
    const schoolYear = await resolveAcademicYearForSchool(
      listSchoolId,
      selectedYear
    );
    return {
      ...base,
      schoolId: listSchoolId,
      ...(schoolYear ? { academicYearSchoolId: schoolYear.id } : {}),
    };
  }

  return {
    ...base,
    schoolId: listSchoolId,
  };
}

function parseStudentData(data: StudentInput) {
  const parsed = studentSchema.parse(data);
  const dobKey = parsed.dateOfBirth?.trim().slice(0, 10);
  const enrollKey = parsed.enrollmentDate?.trim().slice(0, 10);
  return {
    firstName: parsed.firstName.trim(),
    lastName: parsed.lastName.trim(),
    gender: parsed.gender,
    dateOfBirth: dobKey ? parseCalendarDateInput(dobKey) : null,
    emailAddress: parsed.emailAddress?.trim() || null,
    streetAddress: parsed.streetAddress?.trim() || null,
    city: parsed.city?.trim() || null,
    stateProvince: parsed.stateProvince?.trim() || null,
    zipPostalCode: parsed.zipPostalCode?.trim() || null,
    country: parsed.country?.trim() || null,
    fatherGuardianFirstName: parsed.fatherGuardianFirstName?.trim() || null,
    fatherGuardianLastName: parsed.fatherGuardianLastName?.trim() || null,
    fatherParentalResponsibility: parsed.fatherParentalResponsibility ?? null,
    fatherMobileWhatsappNumber: parsed.fatherMobileWhatsappNumber?.trim() || null,
    motherGuardianFirstName: parsed.motherGuardianFirstName?.trim() || null,
    motherGuardianLastName: parsed.motherGuardianLastName?.trim() || null,
    motherParentalResponsibility: parsed.motherParentalResponsibility ?? null,
    motherMobileWhatsappNumber: parsed.motherMobileWhatsappNumber?.trim() || null,
    emergencyContact: parsed.emergencyContact?.trim() || null,
    enrollmentDate: enrollKey
      ? parseCalendarDateInput(enrollKey)
      : schoolTodayUtcDate(),
    isActive: parsed.isActive,
  };
}

function buildStudentDbPayload(
  data: ReturnType<typeof parseStudentData>,
  extra: { originSchoolId?: string | null } = {}
) {
  const pii = encryptStudentPiiForDb({
    dateOfBirth: data.dateOfBirth,
    emailAddress: data.emailAddress,
    emergencyContact: data.emergencyContact,
    streetAddress: data.streetAddress,
    city: data.city,
    stateProvince: data.stateProvince,
    zipPostalCode: data.zipPostalCode,
    country: data.country,
    fatherGuardianFirstName: data.fatherGuardianFirstName,
    fatherGuardianLastName: data.fatherGuardianLastName,
    fatherMobileWhatsappNumber: data.fatherMobileWhatsappNumber,
    motherGuardianFirstName: data.motherGuardianFirstName,
    motherGuardianLastName: data.motherGuardianLastName,
    motherMobileWhatsappNumber: data.motherMobileWhatsappNumber,
  });

  return {
    firstName: data.firstName,
    lastName: data.lastName,
    gender: data.gender,
    enrollmentDate: data.enrollmentDate,
    isActive: data.isActive,
    fatherParentalResponsibility: data.fatherParentalResponsibility,
    motherParentalResponsibility: data.motherParentalResponsibility,
    ...pii,
    ...extra,
  };
}

async function findDuplicateStudent(
  data: ReturnType<typeof parseStudentData>,
  excludeId?: string
): Promise<{ id: string; reason: DuplicateMatchReason } | null> {
  const pii = encryptStudentPiiForDb({
    dateOfBirth: data.dateOfBirth,
    emailAddress: data.emailAddress,
    emergencyContact: data.emergencyContact,
    streetAddress: data.streetAddress,
    city: data.city,
    stateProvince: data.stateProvince,
    zipPostalCode: data.zipPostalCode,
    country: data.country,
    fatherGuardianFirstName: data.fatherGuardianFirstName,
    fatherGuardianLastName: data.fatherGuardianLastName,
    fatherMobileWhatsappNumber: data.fatherMobileWhatsappNumber,
    motherGuardianFirstName: data.motherGuardianFirstName,
    motherGuardianLastName: data.motherGuardianLastName,
    motherMobileWhatsappNumber: data.motherMobileWhatsappNumber,
  });

  const notSelf = excludeId ? { id: { not: excludeId } } : {};

  // Guardians may have multiple children — do not treat shared phone as a duplicate.
  const byName = await prisma.student.findFirst({
    where: {
      deletedAt: null,
      ...notSelf,
      firstName: { equals: data.firstName, mode: "insensitive" },
      lastName: { equals: data.lastName, mode: "insensitive" },
      ...(pii.dateOfBirthHash ? { dateOfBirthHash: pii.dateOfBirthHash } : {}),
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (!byName) return null;

  return {
    id: byName.id,
    reason: pii.dateOfBirthHash ? "name_and_dob" : "name_only",
  };
}

async function ensureStudentAccess(user: AuthUser, studentId: string) {
  const allowed = await assertStudentAccess(user, studentId);
  if (!allowed) {
    throwStudentSaveUserError({
      title: "You cannot save this student",
      description:
        "Your account does not have permission to update this record. Ask a school admin or principal for access.",
    });
  }
}

function rethrowStudentMutationError(error: unknown, fallbackTitle: string): never {
  if (
    error instanceof Error &&
    error.message.includes("||") &&
    !error.message.includes("Server Components")
  ) {
    throw error;
  }
  if (error instanceof ZodError) {
    throwStudentSaveUserError(toStudentSaveUserError(error, fallbackTitle));
  }
  throwStudentSaveUserError(toStudentSaveUserError(error, fallbackTitle));
}

export async function createStudent(data: StudentInput) {
  const user = await requirePermission("students:create");

  try {
    const studentData = parseStudentData(data);

    const duplicate = await findDuplicateStudent(studentData);
    if (duplicate) {
      throwStudentSaveUserError(
        duplicateStudentUserError(duplicate.reason, "create")
      );
    }

    const originSchoolId = user.roles.includes("NIGRA")
      ? null
      : user.schoolIds[0] ?? null;

    const student = await prisma.student.create({
      data: buildStudentDbPayload(studentData, { originSchoolId }),
    });

    await createAuditLog({
      userId: user.id,
      entity: "Student",
      entityId: student.id,
      action: "CREATE",
      newValues: { id: student.id, firstName: student.firstName, lastName: student.lastName },
    });

    revalidatePath("/students");
    return { id: student.id };
  } catch (error) {
    rethrowStudentMutationError(error, "Could not create student");
  }
}

export async function updateStudent(id: string, data: StudentInput) {
  const user = await requirePermission("students:update");
  await ensureStudentAccess(user, id);

  try {
    const studentData = parseStudentData(data);

    const before = await prisma.student.findUnique({ where: { id } });
    if (!before || before.deletedAt) {
      throwStudentSaveUserError({
        title: "Student not found",
        description:
          "This student may have been deleted. Go back to Students and open the record again.",
      });
    }

    const duplicate = await findDuplicateStudent(studentData, id);
    if (duplicate) {
      throwStudentSaveUserError(
        duplicateStudentUserError(duplicate.reason, "update")
      );
    }

    const student = await prisma.student.update({
      where: { id },
      data: buildStudentDbPayload(studentData),
    });

    await createAuditLog({
      userId: user.id,
      entity: "Student",
      entityId: student.id,
      action: "UPDATE",
      oldValues: {
        id: before.id,
        firstName: before.firstName,
        lastName: before.lastName,
        isActive: before.isActive,
      },
      newValues: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        isActive: student.isActive,
      },
    });

    revalidatePath("/students");
    revalidatePath(`/students/${id}`);
    return { id: student.id };
  } catch (error) {
    rethrowStudentMutationError(error, "Could not update student");
  }
}

export async function deleteStudent(id: string) {
  const user = await requirePermission("students:delete");
  await ensureStudentAccess(user, id);

  try {
    const before = await prisma.student.findUnique({ where: { id } });
    if (!before || before.deletedAt) {
      throwStudentSaveUserError({
        title: "Student not found",
        description:
          "This student may have already been deleted. Go back to Students and refresh the list.",
      });
    }

    await prisma.student.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await createAuditLog({
      userId: user.id,
      entity: "Student",
      entityId: before.id,
      action: "DELETE",
      oldValues: { id: before.id, firstName: before.firstName, lastName: before.lastName },
    });

    revalidatePath("/students");
    return { id };
  } catch (error) {
    rethrowStudentMutationError(error, "Could not delete student");
  }
}

export async function getStudents(rawParams: {
  page?: number;
  pageSize?: number;
  search?: string;
  gender?: "MALE" | "FEMALE";
  isActive?: boolean;
  sort?: "lastName" | "firstName" | "enrollmentDate";
  order?: "asc" | "desc";
}) {
  const user = await requirePermission("students:read");
  const params = studentListSchema.parse(rawParams);
  const listSchoolId = await resolveListSchoolId(user);
  const enrollmentWhere = await buildEnrollmentYearFilter(user);

  const where = buildStudentListFilter(user, {
    search: params.search?.trim(),
    gender: params.gender,
    isActive: params.isActive,
    listSchoolId,
  });

  const orderBy =
    params.sort === "lastName"
      ? [
          { lastName: params.order },
          { firstName: params.order },
        ]
      : ({ [params.sort]: params.order } as Prisma.StudentOrderByWithRelationInput);
  const enrollmentVisibility = buildStudentEnrollmentVisibilityFilter(
    user,
    enrollmentWhere,
    listSchoolId
  );

  const studentWhere = mergeStudentQueryFilters(where, enrollmentVisibility);

  const [data, total] = await Promise.all([
    prisma.student.findMany({
      where: studentWhere,
      orderBy,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: {
        enrollments: {
          where: enrollmentWhere,
          take: 1,
          include: {
            school: { select: { name: true } },
            classroom: { select: { name: true } },
            academicYearSchool: {
              select: { academicYear: { select: { name: true } } },
            },
          },
        },
      },
    }),
    prisma.student.count({
      where: studentWhere,
    }),
  ]);

  return {
    data: decryptStudentPiiList(data),
    meta: {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages: Math.ceil(total / params.pageSize),
    },
  };
}

export async function getStudentById(id: string) {
  const user = await requirePermission("students:read");
  await ensureStudentAccess(user, id);

  const student = await prisma.student.findFirst({
    where: { id, deletedAt: null },
    include: {
      enrollments: {
        where: { deletedAt: null },
        orderBy: { enrollmentDate: "desc" },
        include: {
          school: true,
          classroom: { include: { grade: true, section: true } },
          academicYearSchool: { include: { academicYear: true } },
          staff: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  return student ? decryptStudentPii(student) : null;
}

export async function exportStudentsCsv(rawParams: {
  search?: string;
  gender?: "MALE" | "FEMALE";
  isActive?: boolean;
}) {
  const user = await requirePermission("reports:export");
  const params = studentExportSchema.parse(rawParams);
  const listSchoolId = await resolveListSchoolId(user);
  const enrollmentWhere = await buildEnrollmentYearFilter(user);
  const where = buildStudentListFilter(user, {
    search: params.search?.trim(),
    gender: params.gender,
    isActive: params.isActive,
    listSchoolId,
  });
  const enrollmentVisibility = buildStudentEnrollmentVisibilityFilter(
    user,
    enrollmentWhere,
    listSchoolId
  );

  const students = await prisma.student.findMany({
    where: mergeStudentQueryFilters(where, enrollmentVisibility),
    orderBy: STUDENT_NAME_ORDER_BY,
    include: {
      enrollments: {
        where: enrollmentWhere,
        take: 1,
        include: { school: true, classroom: true },
      },
    },
  });

  await createAuditLog({
    userId: user.id,
    entity: "Student",
    action: "EXPORT",
    newValues: { count: students.length },
  });

  return decryptStudentPiiList(students).map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    gender: s.gender,
    dateOfBirth: s.dateOfBirth?.toISOString().split("T")[0] ?? "",
    emailAddress: s.emailAddress ?? "",
    streetAddress: s.streetAddress ?? "",
    city: s.city ?? "",
    stateProvince: s.stateProvince ?? "",
    zipPostalCode: s.zipPostalCode ?? "",
    country: s.country ?? "",
    fatherGuardianFirstName: s.fatherGuardianFirstName ?? "",
    fatherGuardianLastName: s.fatherGuardianLastName ?? "",
    fatherMobileWhatsappNumber: s.fatherMobileWhatsappNumber ?? "",
    motherGuardianFirstName: s.motherGuardianFirstName ?? "",
    motherGuardianLastName: s.motherGuardianLastName ?? "",
    motherMobileWhatsappNumber: s.motherMobileWhatsappNumber ?? "",
    school: s.enrollments[0]?.school.name ?? "",
    classroom: s.enrollments[0]?.classroom.name ?? "",
    isActive: s.isActive ? "Yes" : "No",
  }));
}
