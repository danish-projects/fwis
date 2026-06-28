"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit/create-audit-log";
import { schoolSchema, schoolListSchema, type SchoolInput } from "@/lib/validations/school";
import { deriveCityCode } from "@/lib/students/student-number";

function resolveCityCode(data: SchoolInput, existingCode?: string | null) {
  if (data.cityCode) return data.cityCode;
  if (existingCode) return existingCode;
  return deriveCityCode(data.city);
}

export async function createSchool(data: SchoolInput) {
  const user = await requirePermission("schools:create");
  const parsed = schoolSchema.parse(data);
  const cityCode = resolveCityCode(parsed);

  const school = await prisma.school.create({
    data: {
      ...parsed,
      cityCode,
      email: parsed.email || null,
    },
  });

  await createAuditLog({
    userId: user.id,
    schoolId: school.id,
    entity: "School",
    entityId: school.id,
    action: "CREATE",
    newValues: school,
  });

  revalidatePath("/schools");
  return school;
}

export async function updateSchool(id: string, data: SchoolInput) {
  const user = await requirePermission("schools:update", { schoolId: id });
  const parsed = schoolSchema.parse(data);

  const before = await prisma.school.findUnique({ where: { id } });
  if (!before || before.deletedAt) throw new Error("School not found");

  const cityCode = resolveCityCode(parsed, before.cityCode);

  const school = await prisma.school.update({
    where: { id },
    data: {
      ...parsed,
      cityCode,
      email: parsed.email || null,
    },
  });

  await createAuditLog({
    userId: user.id,
    schoolId: school.id,
    entity: "School",
    entityId: school.id,
    action: "UPDATE",
    oldValues: before,
    newValues: school,
  });

  revalidatePath("/schools");
  revalidatePath(`/schools/${id}`);
  return school;
}

export async function deleteSchool(id: string) {
  const user = await requirePermission("schools:delete", { schoolId: id });

  const before = await prisma.school.findUnique({ where: { id } });
  if (!before || before.deletedAt) throw new Error("School not found");

  const school = await prisma.school.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  await createAuditLog({
    userId: user.id,
    schoolId: school.id,
    entity: "School",
    entityId: school.id,
    action: "DELETE",
    oldValues: before,
  });

  revalidatePath("/schools");
  return school;
}

export async function getSchools(rawParams: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const user = await requirePermission("schools:read");
  const params = schoolListSchema.parse(rawParams);
  const search = params.search?.trim();

  const where = {
    deletedAt: null,
    ...(!user.roles.includes("SUPER_ADMIN") && user.schoolIds.length > 0
      ? { id: { in: user.schoolIds } }
      : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { city: { contains: search, mode: "insensitive" as const } },
            { state: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.school.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.school.count({ where }),
  ]);

  return {
    data,
    meta: {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages: Math.ceil(total / params.pageSize),
    },
  };
}

export async function getSchoolById(id: string) {
  await requirePermission("schools:read", { schoolId: id });

  return prisma.school.findFirst({
    where: { id, deletedAt: null },
    include: {
      _count: {
        select: {
          teachers: { where: { deletedAt: null } },
          enrollments: { where: { deletedAt: null } },
          classrooms: { where: { deletedAt: null } },
        },
      },
    },
  });
}
