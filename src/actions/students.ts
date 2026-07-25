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
  return {
    firstName: parsed.firstName.trim(),
    lastName: parsed.lastName.trim(),
    gender: parsed.gender,
    dateOfBirth: parsed.dateOfBirth ? new Date(parsed.dateOfBirth) : null,
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
    enrollmentDate: parsed.enrollmentDate
      ? new Date(parsed.enrollmentDate)
      : new Date(),
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

async function findDuplicateStudent(data: ReturnType<typeof parseStudentData>) {
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

  const conditions: Prisma.StudentWhereInput[] = [
    {
      deletedAt: null,
      firstName: { equals: data.firstName, mode: "insensitive" },
      lastName: { equals: data.lastName, mode: "insensitive" },
      ...(pii.dateOfBirthHash ? { dateOfBirthHash: pii.dateOfBirthHash } : {}),
    },
  ];

  if (pii.fatherMobileWhatsappHash) {
    conditions.push({
      deletedAt: null,
      OR: [
        { fatherMobileWhatsappHash: pii.fatherMobileWhatsappHash },
        { motherMobileWhatsappHash: pii.fatherMobileWhatsappHash },
      ],
    });
  }
  if (pii.motherMobileWhatsappHash) {
    conditions.push({
      deletedAt: null,
      OR: [
        { motherMobileWhatsappHash: pii.motherMobileWhatsappHash },
        { fatherMobileWhatsappHash: pii.motherMobileWhatsappHash },
      ],
    });
  }

  const duplicate = await prisma.student.findFirst({
    where: { OR: conditions },
  });

  return duplicate ? decryptStudentPii(duplicate) : null;
}

async function ensureStudentAccess(user: AuthUser, studentId: string) {
  const allowed = await assertStudentAccess(user, studentId);
  if (!allowed) throw new Error("Unauthorized access to student");
}

export async function createStudent(data: StudentInput) {
  const user = await requirePermission("students:create");
  const studentData = parseStudentData(data);

  const duplicate = await findDuplicateStudent(studentData);
  if (duplicate) {
    throw new Error(
      "A student with matching name, date of birth, or guardian phone already exists. Use the existing record."
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
  return decryptStudentPii(student);
}

export async function updateStudent(id: string, data: StudentInput) {
  const user = await requirePermission("students:update");
  await ensureStudentAccess(user, id);

  const studentData = parseStudentData(data);

  const before = await prisma.student.findUnique({ where: { id } });
  if (!before || before.deletedAt) throw new Error("Student not found");

  const duplicate = await findDuplicateStudent(studentData);
  if (duplicate && duplicate.id !== id) {
    throw new Error(
      "Another student with matching name, date of birth, or guardian phone already exists."
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
  return decryptStudentPii(student);
}

export async function deleteStudent(id: string) {
  const user = await requirePermission("students:delete");
  await ensureStudentAccess(user, id);

  const before = await prisma.student.findUnique({ where: { id } });
  if (!before || before.deletedAt) throw new Error("Student not found");

  const student = await prisma.student.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  await createAuditLog({
    userId: user.id,
    entity: "Student",
    entityId: student.id,
    action: "DELETE",
    oldValues: { id: before.id, firstName: before.firstName, lastName: before.lastName },
  });

  revalidatePath("/students");
  return decryptStudentPii(student);
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

  const orderBy = { [params.sort]: params.order } as Prisma.StudentOrderByWithRelationInput;
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
    orderBy: { lastName: "asc" },
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
