"use server";

import { Prisma, type AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { formatSchoolDateTime } from "@/lib/utils";

export type AuditLogFilters = {
  page?: number;
  pageSize?: number;
  schoolId?: string;
  gradeId?: number;
  entity?: string;
  action?: AuditAction;
  search?: string;
};

export type AuditLogListRow = {
  id: string;
  createdAtLabel: string;
  action: AuditAction;
  entity: string;
  entityId: string | null;
  schoolName: string | null;
  gradeName: string | null;
  userIdLabel: string;
  summary: string;
};

export type AuditLogListResult = {
  rows: AuditLogListRow[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
  filterOptions: {
    schools: Array<{ id: string; name: string }>;
    grades: Array<{ id: number; name: string }>;
    entities: string[];
    actions: AuditAction[];
  };
};

const AUDIT_ACTIONS: AuditAction[] = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "EXPORT",
  "LOGIN",
  "PROMOTION",
];

function summarizeValues(
  action: AuditAction,
  oldValues: unknown,
  newValues: unknown
): string {
  const pick = (value: unknown): Record<string, unknown> | null => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  };

  const neu = pick(newValues);
  const old = pick(oldValues);

  const parts: string[] = [];
  const nameFrom = (obj: Record<string, unknown> | null) => {
    if (!obj) return null;
    if (typeof obj.name === "string" && obj.name.trim()) return obj.name;
    const first = typeof obj.firstName === "string" ? obj.firstName : "";
    const last = typeof obj.lastName === "string" ? obj.lastName : "";
    const full = `${first} ${last}`.trim();
    return full || null;
  };

  const label = nameFrom(neu) ?? nameFrom(old);
  if (label) parts.push(label);

  if (neu && typeof neu.count === "number") {
    parts.push(`${neu.count} record(s)`);
  }
  if (neu && typeof neu.classroomId === "string") {
    parts.push(`classroom ${neu.classroomId.slice(0, 8)}…`);
  }
  if (neu && typeof neu.calendarDayId === "string") {
    parts.push(`day ${String(neu.calendarDayId).slice(0, 8)}…`);
  }

  if (parts.length === 0) {
    return action === "LOGIN" ? "Signed in" : "—";
  }
  return parts.join(" · ");
}

async function resolveGradeLabels(
  logs: Array<{ entity: string; entityId: string | null }>
): Promise<Map<string, string>> {
  const classroomIds = logs
    .filter((l) => l.entity === "Classroom" && l.entityId)
    .map((l) => l.entityId!);
  const enrollmentIds = logs
    .filter((l) => l.entity === "StudentEnrollment" && l.entityId)
    .map((l) => l.entityId!);

  const map = new Map<string, string>();

  if (classroomIds.length > 0) {
    const classrooms = await prisma.classroom.findMany({
      where: { id: { in: classroomIds } },
      select: { id: true, grade: { select: { name: true } } },
    });
    for (const c of classrooms) {
      map.set(`Classroom:${c.id}`, c.grade.name);
    }
  }

  if (enrollmentIds.length > 0) {
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { id: { in: enrollmentIds } },
      select: {
        id: true,
        classroom: { select: { grade: { select: { name: true } } } },
      },
    });
    for (const e of enrollments) {
      map.set(`StudentEnrollment:${e.id}`, e.classroom.grade.name);
    }
  }

  return map;
}

export async function getAuditLogs(
  filters: AuditLogFilters = {}
): Promise<AuditLogListResult> {
  await requireRole("NIGRA");

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const search = filters.search?.trim();

  const where: Prisma.AuditLogWhereInput = {};

  if (filters.schoolId) {
    where.schoolId = filters.schoolId;
  }

  if (filters.entity) {
    where.entity = filters.entity;
  }

  if (filters.action) {
    where.action = filters.action;
  }

  if (search) {
    const or: Prisma.AuditLogWhereInput[] = [
      { entity: { contains: search, mode: "insensitive" } },
      { user: { userId: { contains: search, mode: "insensitive" } } },
    ];
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search)) {
      or.push({ entityId: search });
    }
    where.OR = or;
  }

  if (filters.gradeId != null && Number.isFinite(filters.gradeId)) {
    const gradeId = filters.gradeId;
    const classrooms = await prisma.classroom.findMany({
      where: { gradeId, deletedAt: null },
      select: { id: true },
    });
    const classroomIds = classrooms.map((c) => c.id);
    const enrollments =
      classroomIds.length > 0
        ? await prisma.studentEnrollment.findMany({
            where: { classroomId: { in: classroomIds }, deletedAt: null },
            select: { id: true },
          })
        : [];
    const enrollmentIds = enrollments.map((e) => e.id);

    const gradeScope: Prisma.AuditLogWhereInput[] = [];
    if (classroomIds.length > 0) {
      gradeScope.push({
        entity: "Classroom",
        entityId: { in: classroomIds },
      });
      for (const classroomId of classroomIds) {
        gradeScope.push({
          entity: "Attendance",
          newValues: { path: ["classroomId"], equals: classroomId },
        });
      }
    }
    if (enrollmentIds.length > 0) {
      gradeScope.push({
        entity: "StudentEnrollment",
        entityId: { in: enrollmentIds },
      });
    }

    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR:
          gradeScope.length > 0
            ? gradeScope
            : [{ id: "00000000-0000-0000-0000-000000000000" }],
      },
    ];
  }

  const [total, logs, schools, grades, entityGroups] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { userId: true, fullName: true } },
        school: { select: { name: true } },
      },
    }),
    prisma.school.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.grade.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    prisma.auditLog.groupBy({
      by: ["entity"],
      orderBy: { entity: "asc" },
    }),
  ]);

  const gradeLabels = await resolveGradeLabels(logs);

  const rows: AuditLogListRow[] = logs.map((log) => ({
    id: log.id,
    createdAtLabel: formatSchoolDateTime(log.createdAt),
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    schoolName: log.school?.name ?? null,
    gradeName: log.entityId
      ? gradeLabels.get(`${log.entity}:${log.entityId}`) ?? null
      : null,
    userIdLabel: log.user?.userId ?? log.user?.fullName ?? "System",
    summary: summarizeValues(log.action, log.oldValues, log.newValues),
  }));

  return {
    rows,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    filterOptions: {
      schools,
      grades,
      entities: entityGroups.map((g) => g.entity),
      actions: AUDIT_ACTIONS,
    },
  };
}
