"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Prisma, UserRoleCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit/create-audit-log";
import {
  assertAssignableRoles,
  assertUserRecordAccess,
  assertUserSchoolAccess,
} from "@/lib/auth/user-access";
import {
  createUserSchema,
  userListSchema,
  userSchema,
  type CreateUserInput,
  type UserInput,
} from "@/lib/validations/user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function normalizeUserInput(data: UserInput) {
  const parsed = userSchema.parse(data);
  return {
    email: parsed.email.trim().toLowerCase(),
    fullName: parsed.fullName.trim(),
    password: parsed.password,
    roleCodes: parsed.roleCodes,
    schoolIds: parsed.roleCodes.includes("SUPER_ADMIN") ? [] : parsed.schoolIds,
    gender:
      parsed.roleCodes.includes("SCHOOL_ADMIN") && parsed.roleCodes.length === 1
        ? (parsed.gender ?? null)
        : null,
    isActive: parsed.isActive,
  };
}

async function syncUserRoles(userId: string, roleCodes: UserRoleCode[]) {
  const roles = await prisma.role.findMany({
    where: { code: { in: roleCodes } },
  });
  if (roles.length !== roleCodes.length) {
    throw new Error("One or more roles are invalid");
  }

  await prisma.userRole.deleteMany({ where: { userId } });
  if (roles.length === 0) return;

  await prisma.userRole.createMany({
    data: roles.map((role) => ({ userId, roleId: role.id })),
  });
}

async function syncUserSchools(userId: string, schoolIds: string[]) {
  await prisma.userSchool.deleteMany({ where: { userId } });
  if (schoolIds.length === 0) return;

  await prisma.userSchool.createMany({
    data: schoolIds.map((schoolId) => ({ userId, schoolId })),
  });
}

async function linkTeacherByEmail(userId: string, email: string) {
  await prisma.teacher.updateMany({
    where: { email, deletedAt: null, userId: null },
    data: { userId },
  });
}

export async function getUsers(rawParams: {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: UserRoleCode;
  schoolId?: string;
  isActive?: boolean;
}) {
  const user = await requirePermission("users:read");
  const params = userListSchema.parse(rawParams);
  const search = params.search?.trim();

  const where: Prisma.AppUserWhereInput = {
    ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
    ...(params.role
      ? { roles: { some: { role: { code: params.role } } } }
      : {}),
    ...(params.schoolId
      ? { schools: { some: { schoolId: params.schoolId } } }
      : !user.roles.includes("SUPER_ADMIN")
        ? { schools: { some: { schoolId: { in: user.schoolIds } } } }
        : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { fullName: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  if (!user.roles.includes("SUPER_ADMIN")) {
    where.NOT = {
      roles: { some: { role: { code: "SUPER_ADMIN" } } },
    };
  }

  const [data, total] = await Promise.all([
    prisma.appUser.findMany({
      where,
      orderBy: [{ fullName: "asc" }, { email: "asc" }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: {
        roles: { include: { role: true } },
        schools: { include: { school: { select: { id: true, name: true } } } },
        teacher: { select: { id: true } },
      },
    }),
    prisma.appUser.count({ where }),
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

export async function getUserById(id: string) {
  const user = await requirePermission("users:read");
  await assertUserRecordAccess(user, id);

  return prisma.appUser.findUnique({
    where: { id },
    include: {
      roles: { include: { role: true } },
      schools: { include: { school: true } },
      teacher: {
        include: {
          school: { select: { id: true, name: true } },
          classrooms: {
            include: {
              classroom: {
                include: { grade: true, section: true },
              },
            },
          },
        },
      },
    },
  });
}

export async function getUserFormOptions() {
  const user = await requirePermission("users:read");

  const [roles, schools] = await Promise.all([
    prisma.role.findMany({ orderBy: { id: "asc" } }),
    prisma.school.findMany({
      where: user.roles.includes("SUPER_ADMIN")
        ? { deletedAt: null, isActive: true }
        : { id: { in: user.schoolIds }, deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const assignableRoles = user.roles.includes("SUPER_ADMIN")
    ? roles
    : roles.filter((r) => r.code !== "SUPER_ADMIN");

  return { roles: assignableRoles, schools };
}

export async function createUser(data: CreateUserInput) {
  const actor = await requirePermission("users:create");
  const input = normalizeUserInput(createUserSchema.parse(data));

  assertAssignableRoles(actor, input.roleCodes);
  await assertUserSchoolAccess(actor, input.schoolIds);

  const duplicate = await prisma.appUser.findUnique({
    where: { email: input.email },
  });
  if (duplicate) {
    throw new Error("A user with this email already exists");
  }

  const userId = randomUUID();
  const supabase = createSupabaseAdminClient();
  const { error: authError } = await supabase.auth.admin.createUser({
    id: userId,
    email: input.email,
    password: input.password!,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (authError) throw new Error(authError.message);

  const appUser = await prisma.appUser.create({
    data: {
      id: userId,
      email: input.email,
      fullName: input.fullName,
      gender: input.gender,
      isActive: input.isActive,
    },
  });

  await syncUserRoles(userId, input.roleCodes);
  await syncUserSchools(userId, input.schoolIds);
  if (input.roleCodes.includes("TEACHER")) {
    await linkTeacherByEmail(userId, input.email);
  }

  await createAuditLog({
    userId: actor.id,
    entity: "AppUser",
    entityId: userId,
    action: "CREATE",
    newValues: {
      ...appUser,
      roleCodes: input.roleCodes,
      schoolIds: input.schoolIds,
    } as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/users");
  return appUser;
}

export async function updateUser(id: string, data: UserInput) {
  const actor = await requirePermission("users:update");
  const existing = await assertUserRecordAccess(actor, id);
  const input = normalizeUserInput(data);

  assertAssignableRoles(actor, input.roleCodes);
  await assertUserSchoolAccess(actor, input.schoolIds);

  if (input.email !== existing.email) {
    const duplicate = await prisma.appUser.findFirst({
      where: { email: input.email, id: { not: id } },
    });
    if (duplicate) throw new Error("A user with this email already exists");
  }

  const before = await prisma.appUser.findUnique({
    where: { id },
    include: { roles: { include: { role: true } }, schools: true },
  });
  if (!before) throw new Error("User not found");

  const supabase = createSupabaseAdminClient();
  const authUpdate: {
    email?: string;
    password?: string;
    user_metadata?: { full_name: string };
  } = {
    email: input.email,
    user_metadata: { full_name: input.fullName },
  };
  if (input.password) authUpdate.password = input.password;

  const { error: authError } = await supabase.auth.admin.updateUserById(
    id,
    authUpdate
  );
  if (authError) throw new Error(authError.message);

  const appUser = await prisma.appUser.update({
    where: { id },
    data: {
      email: input.email,
      fullName: input.fullName,
      gender: input.gender,
      isActive: input.isActive,
    },
  });

  await syncUserRoles(id, input.roleCodes);
  await syncUserSchools(id, input.schoolIds);

  if (input.roleCodes.includes("TEACHER")) {
    await linkTeacherByEmail(id, input.email);
  } else {
    await prisma.teacher.updateMany({
      where: { userId: id },
      data: { userId: null },
    });
  }

  await createAuditLog({
    userId: actor.id,
    entity: "AppUser",
    entityId: id,
    action: "UPDATE",
    oldValues: before as unknown as Prisma.InputJsonValue,
    newValues: {
      ...appUser,
      roleCodes: input.roleCodes,
      schoolIds: input.schoolIds,
    } as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/users");
  revalidatePath(`/users/${id}`);
  return appUser;
}

export async function deleteUser(id: string) {
  const actor = await requirePermission("users:delete");
  await assertUserRecordAccess(actor, id);

  if (actor.id === id) {
    throw new Error("You cannot delete your own account");
  }

  const before = await prisma.appUser.findUnique({
    where: { id },
    include: { roles: { include: { role: true } }, schools: true },
  });
  if (!before) throw new Error("User not found");

  const appUser = await prisma.appUser.update({
    where: { id },
    data: { isActive: false },
  });

  await prisma.teacher.updateMany({
    where: { userId: id },
    data: { userId: null },
  });

  await createAuditLog({
    userId: actor.id,
    entity: "AppUser",
    entityId: id,
    action: "DELETE",
    oldValues: before as unknown as Prisma.InputJsonValue,
    newValues: appUser as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/users");
  return appUser;
}
